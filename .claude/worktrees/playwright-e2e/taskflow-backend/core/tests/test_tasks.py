import pytest

from core.models import Task
from core.tests.factories import ProjectFactory, TaskFactory, UserFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def project_with_lists(user):
    project = ProjectFactory(workspace__owner=user)
    todo = project.task_lists.get(name='To Do')
    in_progress = project.task_lists.get(name='In Progress')
    done = project.task_lists.get(name='Done')
    return project, todo, in_progress, done


def test_create_task_correct_position(auth_client, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    resp = auth_client.post(f'/api/lists/{todo.pk}/tasks/', {'title': 'First'})
    assert resp.status_code == 201
    assert resp.data['position'] == 0

    resp2 = auth_client.post(f'/api/lists/{todo.pk}/tasks/', {'title': 'Second'})
    assert resp2.status_code == 201
    assert resp2.data['position'] == 1


def test_move_within_same_column_resequences_no_dupes(auth_client, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    t0 = TaskFactory(task_list=todo, position=0)
    t1 = TaskFactory(task_list=todo, position=1)
    t2 = TaskFactory(task_list=todo, position=2)

    resp = auth_client.patch(f'/api/tasks/{t2.pk}/move/', {'task_list_id': todo.pk, 'position': 0}, format='json')
    assert resp.status_code == 200

    t0.refresh_from_db()
    t1.refresh_from_db()
    t2.refresh_from_db()
    assert t2.position == 0
    assert t0.position == 1
    assert t1.position == 2
    positions = list(Task.objects.filter(task_list=todo).values_list('position', flat=True))
    assert sorted(positions) == [0, 1, 2]
    assert len(positions) == len(set(positions))


def test_move_to_different_column_removes_from_source_correct_dest_position(auth_client, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    t0 = TaskFactory(task_list=todo, position=0)
    t1 = TaskFactory(task_list=todo, position=1)
    d0 = TaskFactory(task_list=in_progress, position=0)

    resp = auth_client.patch(
        f'/api/tasks/{t0.pk}/move/', {'task_list_id': in_progress.pk, 'position': 1}, format='json'
    )
    assert resp.status_code == 200

    t0.refresh_from_db()
    t1.refresh_from_db()
    d0.refresh_from_db()

    assert t0.task_list_id == in_progress.pk
    assert t0.position == 1
    assert d0.position == 0
    # source list re-sequenced, no gaps
    assert t1.position == 0
    remaining_source = list(Task.objects.filter(task_list=todo).values_list('position', flat=True))
    assert remaining_source == [0]


def test_move_to_top_of_nonempty_column_shifts_others_down(auth_client, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    d0 = TaskFactory(task_list=in_progress, position=0)
    d1 = TaskFactory(task_list=in_progress, position=1)
    src = TaskFactory(task_list=todo, position=0)

    resp = auth_client.patch(
        f'/api/tasks/{src.pk}/move/', {'task_list_id': in_progress.pk, 'position': 0}, format='json'
    )
    assert resp.status_code == 200

    src.refresh_from_db()
    d0.refresh_from_db()
    d1.refresh_from_db()

    assert src.position == 0
    assert d0.position == 1
    assert d1.position == 2


def test_assign_non_member_returns_400(auth_client, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    task = TaskFactory(task_list=todo, position=0)
    outsider = UserFactory()

    resp = auth_client.patch(f'/api/tasks/{task.pk}/', {'assignees': [outsider.pk]}, format='json')
    assert resp.status_code == 400
    assert 'not members of this workspace' in resp.data['detail']


def test_delete_task_gone_and_no_position_gaps(auth_client, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    t0 = TaskFactory(task_list=todo, position=0)
    t1 = TaskFactory(task_list=todo, position=1)
    t2 = TaskFactory(task_list=todo, position=2)

    resp = auth_client.delete(f'/api/tasks/{t1.pk}/')
    assert resp.status_code == 204
    assert not Task.objects.filter(pk=t1.pk).exists()

    remaining_positions = sorted(Task.objects.filter(task_list=todo).values_list('position', flat=True))
    assert remaining_positions == [0, 1]


def test_create_task_requires_title(auth_client, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    resp = auth_client.post(f'/api/lists/{todo.pk}/tasks/', {'title': '   '})
    assert resp.status_code == 400


def test_move_task_to_different_workspace_rejected(auth_client, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    other_project = ProjectFactory()
    other_list = other_project.task_lists.get(name='To Do')
    task = TaskFactory(task_list=todo, position=0)

    resp = auth_client.patch(
        f'/api/tasks/{task.pk}/move/', {'task_list_id': other_list.pk, 'position': 0}, format='json'
    )
    assert resp.status_code == 400


def test_non_member_cannot_view_task(client_for, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    task = TaskFactory(task_list=todo, position=0)
    stranger = UserFactory()
    client = client_for(stranger)
    resp = client.get(f'/api/tasks/{task.pk}/')
    assert resp.status_code == 403


def test_update_task_priority(auth_client, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    task = TaskFactory(task_list=todo, position=0, priority='NONE')
    resp = auth_client.patch(f'/api/tasks/{task.pk}/', {'priority': 'HIGH'}, format='json')
    assert resp.status_code == 200
    task.refresh_from_db()
    assert task.priority == 'HIGH'


def test_update_task_invalid_priority_rejected(auth_client, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    task = TaskFactory(task_list=todo, position=0)
    resp = auth_client.patch(f'/api/tasks/{task.pk}/', {'priority': 'NOT_REAL'}, format='json')
    assert resp.status_code == 400
