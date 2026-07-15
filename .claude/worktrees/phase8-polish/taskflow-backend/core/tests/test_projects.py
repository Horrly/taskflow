import pytest

from core.models import Project, TaskList
from core.tests.factories import UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def test_create_project_creates_3_default_tasklists_with_positions(auth_client, workspace):
    resp = auth_client.post(f'/api/workspaces/{workspace.pk}/projects/', {'name': 'New Project'})
    assert resp.status_code == 201
    project = Project.objects.get(pk=resp.data['id'])
    lists = list(project.task_lists.order_by('position'))
    assert [tl.name for tl in lists] == ['To Do', 'In Progress', 'Done']
    assert [tl.position for tl in lists] == [0, 1, 2]


def test_reorder_list_position_2_to_0_resequences(auth_client, workspace):
    resp = auth_client.post(f'/api/workspaces/{workspace.pk}/projects/', {'name': 'Reorder Project'})
    project = Project.objects.get(pk=resp.data['id'])
    todo = project.task_lists.get(name='To Do')
    in_progress = project.task_lists.get(name='In Progress')
    done = project.task_lists.get(name='Done')

    resp = auth_client.patch(f'/api/lists/{done.pk}/reorder/', {'position': 0}, format='json')
    assert resp.status_code == 200

    todo.refresh_from_db()
    in_progress.refresh_from_db()
    done.refresh_from_db()
    assert done.position == 0
    assert todo.position == 1
    assert in_progress.position == 2

    positions = sorted(project.task_lists.values_list('position', flat=True))
    assert positions == [0, 1, 2]


def test_non_member_cannot_create_project(client_for, workspace):
    stranger = UserFactory()
    client = client_for(stranger)
    resp = client.post(f'/api/workspaces/{workspace.pk}/projects/', {'name': 'Nope'})
    assert resp.status_code == 403


def test_non_member_cannot_list_projects(client_for, workspace):
    stranger = UserFactory()
    client = client_for(stranger)
    resp = client.get(f'/api/workspaces/{workspace.pk}/projects/')
    assert resp.status_code == 403


def test_reorder_list_out_of_range_rejected(auth_client, workspace):
    resp = auth_client.post(f'/api/workspaces/{workspace.pk}/projects/', {'name': 'P'})
    project = Project.objects.get(pk=resp.data['id'])
    todo = project.task_lists.get(name='To Do')

    resp = auth_client.patch(f'/api/lists/{todo.pk}/reorder/', {'position': 99}, format='json')
    assert resp.status_code == 400


def test_project_list_endpoint_returns_progress(auth_client, workspace):
    resp = auth_client.post(f'/api/workspaces/{workspace.pk}/projects/', {'name': 'Tracked'})
    assert resp.status_code == 201

    resp = auth_client.get(f'/api/workspaces/{workspace.pk}/projects/')
    assert resp.status_code == 200
    project_data = next(p for p in resp.data if p['name'] == 'Tracked')
    assert project_data['progress'] == {'total_tasks': 0, 'completed_tasks': 0, 'percent': 0}
