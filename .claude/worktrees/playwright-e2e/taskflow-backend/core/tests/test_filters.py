from datetime import timedelta

import pytest
from django.utils import timezone

from core.tests.factories import ProjectFactory, TaskFactory, TaskListFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _assign(task, *users):
    task.assignees.set(users)


def test_my_tasks_returns_only_assigned_to_me(auth_client, user):
    project = ProjectFactory()
    todo = project.task_lists.get(name='To Do')
    mine = TaskFactory(task_list=todo, title='Mine')
    _assign(mine, user)
    other = UserFactory()
    not_mine = TaskFactory(task_list=todo, title='Not mine')
    _assign(not_mine, other)

    resp = auth_client.get('/api/me/tasks/')
    assert resp.status_code == 200
    titles = [t['title'] for t in resp.data['results']]
    assert 'Mine' in titles
    assert 'Not mine' not in titles


def test_priority_filter(auth_client, user):
    project = ProjectFactory()
    todo = project.task_lists.get(name='To Do')
    high = TaskFactory(task_list=todo, title='High one', priority='HIGH')
    low = TaskFactory(task_list=todo, title='Low one', priority='LOW')
    _assign(high, user)
    _assign(low, user)

    resp = auth_client.get('/api/me/tasks/?priority=HIGH')
    assert resp.status_code == 200
    titles = [t['title'] for t in resp.data['results']]
    assert titles == ['High one']


def test_overdue_filter_excludes_done_and_future(auth_client, user):
    project = ProjectFactory()
    todo = project.task_lists.get(name='To Do')
    done = project.task_lists.get(name='Done')
    today = timezone.localdate()

    overdue = TaskFactory(task_list=todo, title='Overdue', due_date=today - timedelta(days=2))
    done_overdue = TaskFactory(task_list=done, title='Done but old', due_date=today - timedelta(days=2))
    future = TaskFactory(task_list=todo, title='Future', due_date=today + timedelta(days=2))
    for t in (overdue, done_overdue, future):
        _assign(t, user)

    resp = auth_client.get('/api/me/tasks/?overdue=true')
    assert resp.status_code == 200
    titles = [t['title'] for t in resp.data['results']]
    assert titles == ['Overdue']


def test_workspace_filter_narrows_results(auth_client, user):
    ws1 = WorkspaceFactory(owner=user)
    ws2 = WorkspaceFactory(owner=user)
    p1 = ProjectFactory(workspace=ws1)
    p2 = ProjectFactory(workspace=ws2)
    t1 = TaskFactory(task_list=p1.task_lists.get(name='To Do'), title='In ws1')
    t2 = TaskFactory(task_list=p2.task_lists.get(name='To Do'), title='In ws2')
    _assign(t1, user)
    _assign(t2, user)

    resp = auth_client.get(f'/api/me/tasks/?workspace={ws1.id}')
    assert resp.status_code == 200
    titles = [t['title'] for t in resp.data['results']]
    assert titles == ['In ws1']


def test_my_stats_overdue_count_matches_hand_computed(auth_client, user):
    project = ProjectFactory()
    todo = project.task_lists.get(name='To Do')
    today = timezone.localdate()

    overdue1 = TaskFactory(task_list=todo, due_date=today - timedelta(days=1))
    overdue2 = TaskFactory(task_list=todo, due_date=today - timedelta(days=5))
    not_overdue = TaskFactory(task_list=todo, due_date=today + timedelta(days=1))
    for t in (overdue1, overdue2, not_overdue):
        _assign(t, user)

    resp = auth_client.get('/api/me/stats/')
    assert resp.status_code == 200
    assert resp.data['overdue'] == 2


def test_my_stats_due_today_count_matches_tasks_due_today(auth_client, user):
    project = ProjectFactory()
    todo = project.task_lists.get(name='To Do')
    today = timezone.localdate()

    due_today1 = TaskFactory(task_list=todo, due_date=today)
    due_today2 = TaskFactory(task_list=todo, due_date=today)
    due_tomorrow = TaskFactory(task_list=todo, due_date=today + timedelta(days=1))
    for t in (due_today1, due_today2, due_tomorrow):
        _assign(t, user)

    resp = auth_client.get('/api/me/stats/')
    assert resp.status_code == 200
    assert resp.data['due_today'] == 2
