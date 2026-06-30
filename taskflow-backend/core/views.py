from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, Workspace
from .permissions import IsWorkspaceMember, IsWorkspaceOwner
from .serializers import (
    RegisterSerializer,
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
