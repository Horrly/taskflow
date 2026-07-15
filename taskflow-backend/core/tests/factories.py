import factory
from factory.django import DjangoModelFactory

from core.models import ActivityLog, Comment, Label, Project, Task, TaskList, User, Workspace


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f'user{n}@example.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    username = factory.LazyAttribute(lambda o: o.email)

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        password = kwargs.pop('password', 'TestPass123!')
        manager = cls._get_manager(model_class)
        user = manager.create_user(*args, password=password, **kwargs)
        return user


class WorkspaceFactory(DjangoModelFactory):
    class Meta:
        model = Workspace

    name = factory.Sequence(lambda n: f'Workspace {n}')
    owner = factory.SubFactory(UserFactory)


class ProjectFactory(DjangoModelFactory):
    class Meta:
        model = Project

    workspace = factory.SubFactory(WorkspaceFactory)
    name = factory.Sequence(lambda n: f'Project {n}')
    description = ''
    created_by = factory.SelfAttribute('workspace.owner')

    @factory.post_generation
    def default_lists(obj, create, extracted, **kwargs):
        # Replicates the 3 default TaskLists the `workspace_projects` POST
        # view creates on project creation (see core/views.py). Raw model
        # creation doesn't get this for free, so the factory mirrors it.
        if not create:
            return
        if extracted is False:
            return
        TaskList.objects.bulk_create([
            TaskList(project=obj, name='To Do', position=0, color='#9CA3AF'),
            TaskList(project=obj, name='In Progress', position=1, color='#3B82F6'),
            TaskList(project=obj, name='Done', position=2, color='#10B981'),
        ])


class TaskListFactory(DjangoModelFactory):
    class Meta:
        model = TaskList

    project = factory.SubFactory(ProjectFactory, default_lists=False)
    name = factory.Sequence(lambda n: f'List {n}')
    position = factory.Sequence(lambda n: n)
    color = ''


class TaskFactory(DjangoModelFactory):
    class Meta:
        model = Task

    task_list = factory.SubFactory(TaskListFactory)
    title = factory.Sequence(lambda n: f'Task {n}')
    position = factory.Sequence(lambda n: n)
    created_by = factory.SelfAttribute('task_list.project.workspace.owner')


class LabelFactory(DjangoModelFactory):
    class Meta:
        model = Label

    workspace = factory.SubFactory(WorkspaceFactory)
    name = factory.Sequence(lambda n: f'Label {n}')
    color = '#6366F1'
    created_by = factory.SelfAttribute('workspace.owner')


class CommentFactory(DjangoModelFactory):
    class Meta:
        model = Comment

    task = factory.SubFactory(TaskFactory)
    author = factory.SelfAttribute('task.task_list.project.workspace.owner')
    body = factory.Faker('sentence')


class ActivityLogFactory(DjangoModelFactory):
    class Meta:
        model = ActivityLog

    workspace = factory.SubFactory(WorkspaceFactory)
    actor = factory.SelfAttribute('workspace.owner')
    verb = 'created task'
