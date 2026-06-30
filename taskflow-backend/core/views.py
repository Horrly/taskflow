from django.db import transaction
from django.db.models import F, Max
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Project, Task, TaskList, User, Workspace
from .permissions import IsWorkspaceMember, IsWorkspaceOwner
from .serializers import (
    ProjectListSerializer,
    ProjectSerializer,
    ProjectWriteSerializer,
    RegisterSerializer,
    TaskDetailSerializer,
    TaskListSerializer,
    TaskSerializer,
    UserSerializer,
    WorkspaceMemberSerializer,
    WorkspaceSerializer,
    WorkspaceListSerializer,
)


def _token_pair(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(
            {'user': UserSerializer(user).data, **_token_pair(user)},
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'detail': 'Invalid credentials.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.check_password(password):
        return Response(
            {'detail': 'Invalid credentials.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {'detail': 'Account is disabled.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    return Response({'user': UserSerializer(user).data, **_token_pair(user)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


class WorkspaceViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return Workspace.objects.filter(members=self.request.user).select_related('owner').prefetch_related('members')

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkspaceListSerializer
        return WorkspaceSerializer

    def get_permissions(self):
        if self.action in ['partial_update', 'destroy', 'remove_member']:
            return [IsAuthenticated(), IsWorkspaceOwner()]
        return [IsAuthenticated(), IsWorkspaceMember()]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = WorkspaceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        workspace = self.get_object()
        serializer = WorkspaceMemberSerializer(workspace.members.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        workspace = self.get_object()
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'No user found with this email — they need to register first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if workspace.members.filter(pk=user.pk).exists():
            return Response(
                {'detail': 'This user is already a member of the workspace.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        workspace.members.add(user)
        return Response(
            {'detail': 'User invited successfully.', 'member': WorkspaceMemberSerializer(user).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], url_path='remove-member')
    def remove_member(self, request, pk=None):
        workspace = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target = workspace.members.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found in this workspace.'}, status=status.HTTP_404_NOT_FOUND)
        if target.pk == workspace.owner_id:
            return Response({'detail': "Cannot remove the workspace owner."}, status=status.HTTP_400_BAD_REQUEST)
        workspace.members.remove(target)
        return Response({'detail': 'Member removed.'}, status=status.HTTP_200_OK)


# ── Project views ─────────────────────────────────────────────────────────────

def _workspace_member_or_403(request, workspace):
    if not workspace.members.filter(pk=request.user.pk).exists():
        return Response({'detail': 'Not a member of this workspace.'}, status=status.HTTP_403_FORBIDDEN)
    return None


def _project_qs():
    return Project.objects.select_related('workspace').prefetch_related(
        'task_lists__tasks__assignees'
    )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def workspace_projects(request, workspace_id):
    workspace = get_object_or_404(Workspace, pk=workspace_id)
    err = _workspace_member_or_403(request, workspace)
    if err:
        return err

    if request.method == 'GET':
        projects = workspace.projects.order_by('-created_at')
        return Response(ProjectListSerializer(projects, many=True).data)

    serializer = ProjectWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    project = serializer.save(workspace=workspace, created_by=request.user)
    TaskList.objects.bulk_create([
        TaskList(project=project, name='To Do', position=0, color='#9CA3AF'),
        TaskList(project=project, name='In Progress', position=1, color='#3B82F6'),
        TaskList(project=project, name='Done', position=2, color='#10B981'),
    ])
    return Response(
        ProjectSerializer(_project_qs().get(pk=project.pk)).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def project_detail(request, pk):
    project = get_object_or_404(_project_qs(), pk=pk)
    err = _workspace_member_or_403(request, project.workspace)
    if err:
        return err

    if request.method == 'GET':
        return Response(ProjectSerializer(project).data)

    if request.method == 'PATCH':
        serializer = ProjectWriteSerializer(project, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        return Response(ProjectSerializer(_project_qs().get(pk=project.pk)).data)

    project.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── TaskList views ────────────────────────────────────────────────────────────

def _tasklist_qs():
    return TaskList.objects.select_related('project__workspace').prefetch_related('tasks__assignees')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def project_lists(request, pk):
    project = get_object_or_404(Project.objects.select_related('workspace'), pk=pk)
    err = _workspace_member_or_403(request, project.workspace)
    if err:
        return err

    if request.method == 'GET':
        lists = project.task_lists.prefetch_related('tasks__assignees').order_by('position')
        return Response(TaskListSerializer(lists, many=True).data)

    name = request.data.get('name', '').strip()
    if not name:
        return Response({'detail': 'name is required.'}, status=status.HTTP_400_BAD_REQUEST)
    color = request.data.get('color', '')
    max_pos = project.task_lists.aggregate(m=Max('position'))['m']
    position = 0 if max_pos is None else max_pos + 1
    tl = TaskList.objects.create(project=project, name=name, position=position, color=color)
    return Response(TaskListSerializer(_tasklist_qs().get(pk=tl.pk)).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def tasklist_detail(request, pk):
    tl = get_object_or_404(_tasklist_qs(), pk=pk)
    err = _workspace_member_or_403(request, tl.project.workspace)
    if err:
        return err

    if request.method == 'PATCH':
        if 'name' in request.data:
            name = request.data['name'].strip()
            if not name:
                return Response({'detail': 'name cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
            tl.name = name
        if 'color' in request.data:
            tl.color = request.data['color']
        tl.save()
        return Response(TaskListSerializer(_tasklist_qs().get(pk=tl.pk)).data)

    task_count = tl.tasks.count()
    if task_count > 0:
        return Response(
            {'detail': f'This list has {task_count} task(s). Delete or move them first.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    tl.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def tasklist_reorder(request, pk):
    tl = get_object_or_404(TaskList.objects.select_related('project__workspace'), pk=pk)
    err = _workspace_member_or_403(request, tl.project.workspace)
    if err:
        return err

    new_position = request.data.get('position')
    if new_position is None:
        return Response({'detail': 'position is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        new_position = int(new_position)
    except (TypeError, ValueError):
        return Response({'detail': 'position must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)

    project = tl.project
    count = project.task_lists.count()
    if new_position < 0 or new_position >= count:
        return Response(
            {'detail': f'position must be between 0 and {count - 1}.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    current_position = tl.position
    if current_position != new_position:
        with transaction.atomic():
            if new_position < current_position:
                project.task_lists.filter(
                    position__gte=new_position, position__lt=current_position
                ).update(position=F('position') + 1)
            else:
                project.task_lists.filter(
                    position__gt=current_position, position__lte=new_position
                ).update(position=F('position') - 1)
            tl.position = new_position
            tl.save()

    lists = project.task_lists.prefetch_related('tasks__assignees').order_by('position')
    return Response(TaskListSerializer(lists, many=True).data)


# ── Task views ────────────────────────────────────────────────────────────────

def _task_qs():
    return Task.objects.select_related(
        'task_list__project__workspace', 'created_by'
    ).prefetch_related('assignees')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_tasks(request, list_id):
    tl = get_object_or_404(TaskList.objects.select_related('project__workspace'), pk=list_id)
    err = _workspace_member_or_403(request, tl.project.workspace)
    if err:
        return err

    if request.method == 'GET':
        tasks = tl.tasks.prefetch_related('assignees').order_by('position')
        return Response(TaskSerializer(tasks, many=True).data)

    title = request.data.get('title', '').strip()
    if not title:
        return Response({'detail': 'title is required.'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        max_pos = tl.tasks.aggregate(m=Max('position'))['m']
        position = 0 if max_pos is None else max_pos + 1
        task = Task.objects.create(
            task_list=tl,
            title=title,
            position=position,
            created_by=request.user,
        )
    return Response(TaskSerializer(_task_qs().get(pk=task.pk)).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def task_detail(request, pk):
    task = get_object_or_404(_task_qs(), pk=pk)
    err = _workspace_member_or_403(request, task.task_list.project.workspace)
    if err:
        return err

    if request.method == 'GET':
        return Response(TaskDetailSerializer(task).data)

    if request.method == 'PATCH':
        workspace = task.task_list.project.workspace
        data = request.data
        assignee_ids = None

        if 'title' in data:
            title = str(data['title']).strip()
            if not title:
                return Response({'detail': 'title cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
            task.title = title

        if 'description' in data:
            task.description = data['description']

        if 'priority' in data:
            valid = [c[0] for c in Task.PRIORITY_CHOICES]
            if data['priority'] not in valid:
                return Response(
                    {'detail': f'Invalid priority. Choose from: {", ".join(valid)}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            task.priority = data['priority']

        if 'due_date' in data:
            task.due_date = data['due_date'] or None

        if 'assignees' in data:
            assignee_ids = data['assignees']
            if not isinstance(assignee_ids, list):
                return Response(
                    {'detail': 'assignees must be a list of user IDs.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            valid_ids = set(
                workspace.members.filter(pk__in=assignee_ids).values_list('pk', flat=True)
            )
            invalid = [uid for uid in assignee_ids if uid not in valid_ids]
            if invalid:
                return Response(
                    {'detail': f'Users {invalid} are not members of this workspace.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        task.save()
        if assignee_ids is not None:
            task.assignees.set(assignee_ids)

        return Response(TaskDetailSerializer(_task_qs().get(pk=task.pk)).data)

    task.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def task_move(request, pk):
    task = get_object_or_404(
        Task.objects.select_related('task_list__project__workspace'), pk=pk
    )
    err = _workspace_member_or_403(request, task.task_list.project.workspace)
    if err:
        return err

    new_list_id = request.data.get('task_list_id')
    new_position = request.data.get('position')

    if new_list_id is None or new_position is None:
        return Response(
            {'detail': 'task_list_id and position are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        new_list_id = int(new_list_id)
        new_position = int(new_position)
    except (TypeError, ValueError):
        return Response(
            {'detail': 'task_list_id and position must be integers.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if new_position < 0:
        return Response({'detail': 'position must be >= 0.'}, status=status.HTTP_400_BAD_REQUEST)

    dest_list = get_object_or_404(
        TaskList.objects.select_related('project__workspace'), pk=new_list_id
    )
    if dest_list.project.workspace_id != task.task_list.project.workspace_id:
        return Response(
            {'detail': 'Cannot move task to a different workspace.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    old_list = task.task_list
    old_position = task.position

    with transaction.atomic():
        if old_list.id == dest_list.id:
            # Reorder within the same list
            if new_position != old_position:
                if new_position < old_position:
                    Task.objects.filter(
                        task_list=old_list,
                        position__gte=new_position,
                        position__lt=old_position,
                    ).update(position=F('position') + 1)
                else:
                    Task.objects.filter(
                        task_list=old_list,
                        position__gt=old_position,
                        position__lte=new_position,
                    ).update(position=F('position') - 1)
                task.position = new_position
                task.save()
        else:
            # Close the gap in the source list
            Task.objects.filter(
                task_list=old_list,
                position__gt=old_position,
            ).update(position=F('position') - 1)

            # Make room in the destination list
            Task.objects.filter(
                task_list=dest_list,
                position__gte=new_position,
            ).update(position=F('position') + 1)

            # Move the task
            task.task_list = dest_list
            task.position = new_position
            task.save()

    return Response(TaskSerializer(_task_qs().get(pk=task.pk)).data)
