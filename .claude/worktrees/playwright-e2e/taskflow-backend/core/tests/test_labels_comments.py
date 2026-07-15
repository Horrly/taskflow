import pytest

from core.models import Comment, Label
from core.tests.factories import CommentFactory, LabelFactory, TaskFactory, UserFactory

pytestmark = pytest.mark.django_db


def test_create_label_appears_in_workspace_list(auth_client, workspace):
    resp = auth_client.post(f'/api/workspaces/{workspace.pk}/labels/', {'name': 'Bug', 'color': '#FF0000'})
    assert resp.status_code == 201

    list_resp = auth_client.get(f'/api/workspaces/{workspace.pk}/labels/')
    assert list_resp.status_code == 200
    names = [l['name'] for l in list_resp.data]
    assert 'Bug' in names


def test_apply_label_to_task_appears_in_task_detail(auth_client, workspace, user):
    from core.tests.factories import ProjectFactory
    project = ProjectFactory(workspace=workspace)
    todo = project.task_lists.get(name='To Do')
    task = TaskFactory(task_list=todo)
    label = LabelFactory(workspace=workspace)

    resp = auth_client.post(f'/api/tasks/{task.pk}/labels/', {'label_id': label.pk})
    assert resp.status_code == 200

    detail = auth_client.get(f'/api/tasks/{task.pk}/')
    label_ids = [l['id'] for l in detail.data['labels']]
    assert label.pk in label_ids


def test_remove_label_gone_from_detail(auth_client, workspace):
    from core.tests.factories import ProjectFactory
    project = ProjectFactory(workspace=workspace)
    todo = project.task_lists.get(name='To Do')
    task = TaskFactory(task_list=todo)
    label = LabelFactory(workspace=workspace)
    task.labels.add(label)

    resp = auth_client.delete(f'/api/tasks/{task.pk}/labels/{label.pk}/')
    assert resp.status_code == 204

    detail = auth_client.get(f'/api/tasks/{task.pk}/')
    label_ids = [l['id'] for l in detail.data['labels']]
    assert label.pk not in label_ids


def test_delete_label_removed_from_all_tasks(auth_client, workspace):
    from core.tests.factories import ProjectFactory
    project = ProjectFactory(workspace=workspace)
    todo = project.task_lists.get(name='To Do')
    task1 = TaskFactory(task_list=todo, position=0)
    task2 = TaskFactory(task_list=todo, position=1)
    label = LabelFactory(workspace=workspace)
    task1.labels.add(label)
    task2.labels.add(label)

    resp = auth_client.delete(f'/api/labels/{label.pk}/')
    assert resp.status_code == 204
    assert not Label.objects.filter(pk=label.pk).exists()

    assert task1.labels.count() == 0
    assert task2.labels.count() == 0


def test_post_comment_correct_author(auth_client, workspace, user):
    from core.tests.factories import ProjectFactory
    project = ProjectFactory(workspace=workspace)
    todo = project.task_lists.get(name='To Do')
    task = TaskFactory(task_list=todo)

    resp = auth_client.post(f'/api/tasks/{task.pk}/comments/', {'body': 'Hello there'})
    assert resp.status_code == 201
    assert resp.data['author']['email'] == user.email
    assert resp.data['is_edited'] is False


def test_edit_own_comment_sets_is_edited_true(auth_client, workspace, user):
    from core.tests.factories import ProjectFactory
    project = ProjectFactory(workspace=workspace)
    todo = project.task_lists.get(name='To Do')
    task = TaskFactory(task_list=todo)
    comment = CommentFactory(task=task, author=user, body='original')

    resp = auth_client.patch(f'/api/comments/{comment.pk}/', {'body': 'edited'}, format='json')
    assert resp.status_code == 200
    assert resp.data['is_edited'] is True
    assert resp.data['body'] == 'edited'


def test_edit_others_comment_returns_403(client_for, workspace):
    from core.tests.factories import ProjectFactory
    project = ProjectFactory(workspace=workspace)
    todo = project.task_lists.get(name='To Do')
    task = TaskFactory(task_list=todo)
    comment = CommentFactory(task=task, author=workspace.owner, body='original')

    other = UserFactory()
    workspace.members.add(other)
    client = client_for(other)

    resp = client.patch(f'/api/comments/{comment.pk}/', {'body': 'hacked'}, format='json')
    assert resp.status_code == 403
    comment.refresh_from_db()
    assert comment.body == 'original'


def test_delete_others_comment_returns_403(client_for, workspace):
    from core.tests.factories import ProjectFactory
    project = ProjectFactory(workspace=workspace)
    todo = project.task_lists.get(name='To Do')
    task = TaskFactory(task_list=todo)
    comment = CommentFactory(task=task, author=workspace.owner, body='original')

    other = UserFactory()
    workspace.members.add(other)
    client = client_for(other)

    resp = client.delete(f'/api/comments/{comment.pk}/')
    assert resp.status_code == 403
    assert Comment.objects.filter(pk=comment.pk).exists()
