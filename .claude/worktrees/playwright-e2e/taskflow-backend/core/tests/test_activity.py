import pytest

from core.models import ActivityLog
from core.tests.factories import ProjectFactory, UserFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def project_with_lists(user, workspace):
    project = ProjectFactory(workspace=workspace)
    todo = project.task_lists.get(name='To Do')
    in_progress = project.task_lists.get(name='In Progress')
    done = project.task_lists.get(name='Done')
    return project, todo, in_progress, done


def test_create_task_logs_created_task_activity(auth_client, workspace, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    resp = auth_client.post(f'/api/lists/{todo.pk}/tasks/', {'title': 'Log Me'})
    assert resp.status_code == 201

    logs = ActivityLog.objects.filter(workspace=workspace, verb='created task')
    assert logs.count() == 1
    assert logs.first().task_title == 'Log Me'


def test_move_task_logs_moved_task_with_correct_detail(auth_client, workspace, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    create_resp = auth_client.post(f'/api/lists/{todo.pk}/tasks/', {'title': 'Movable'})
    task_id = create_resp.data['id']

    move_resp = auth_client.patch(
        f'/api/tasks/{task_id}/move/', {'task_list_id': in_progress.pk, 'position': 0}, format='json'
    )
    assert move_resp.status_code == 200

    log = ActivityLog.objects.filter(workspace=workspace, verb='moved task').first()
    assert log is not None
    assert log.detail == "from 'To Do' to 'In Progress'"


def test_workspace_activity_feed_newest_first(auth_client, workspace, project_with_lists):
    project, todo, in_progress, done = project_with_lists
    auth_client.post(f'/api/lists/{todo.pk}/tasks/', {'title': 'First'})
    auth_client.post(f'/api/lists/{todo.pk}/tasks/', {'title': 'Second'})

    resp = auth_client.get(f'/api/workspaces/{workspace.pk}/activity/')
    assert resp.status_code == 200
    results = resp.data['results']
    assert len(results) >= 2
    created_ats = [r['created_at'] for r in results]
    assert created_ats == sorted(created_ats, reverse=True)
    # newest activity should be for the task created last
    assert results[0]['task_title'] == 'Second'


def test_workspace_activity_non_member_returns_403(client_for, workspace):
    stranger = UserFactory()
    client = client_for(stranger)
    resp = client.get(f'/api/workspaces/{workspace.pk}/activity/')
    assert resp.status_code == 403


def test_workspace_activity_post_returns_405(auth_client, workspace):
    resp = auth_client.post(f'/api/workspaces/{workspace.pk}/activity/', {})
    assert resp.status_code == 405
