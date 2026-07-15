import pytest

from core.models import Workspace
from core.tests.factories import UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def test_create_workspace_owner_in_members(auth_client, user):
    resp = auth_client.post('/api/workspaces/', {'name': 'My Workspace'})
    assert resp.status_code == 201
    ws = Workspace.objects.get(pk=resp.data['id'])
    assert ws.members.filter(pk=user.pk).exists()
    assert ws.owner_id == user.pk


def test_non_member_access_returns_403(client_for, workspace):
    stranger = UserFactory()
    client = client_for(stranger)
    resp = client.get(f'/api/workspaces/{workspace.pk}/')
    assert resp.status_code == 403


def test_invite_existing_user_appears_in_members(auth_client, workspace):
    invitee = UserFactory(email='invitee@example.com')
    resp = auth_client.post(f'/api/workspaces/{workspace.pk}/invite/', {'email': 'invitee@example.com'})
    assert resp.status_code == 200
    assert workspace.members.filter(pk=invitee.pk).exists()


def test_invite_nonexistent_email_returns_404_friendly_message(auth_client, workspace):
    resp = auth_client.post(f'/api/workspaces/{workspace.pk}/invite/', {'email': 'nobody@example.com'})
    assert resp.status_code == 404
    assert resp.data == {'detail': 'No user found with this email — they need to register first.'}


def test_invite_already_member_returns_400_friendly_message(auth_client, workspace, user):
    resp = auth_client.post(f'/api/workspaces/{workspace.pk}/invite/', {'email': user.email})
    assert resp.status_code == 400
    assert resp.data == {'detail': 'This user is already a member of the workspace.'}


def test_only_owner_can_delete_workspace(client_for, workspace):
    other = UserFactory()
    workspace.members.add(other)
    client = client_for(other)
    resp = client.delete(f'/api/workspaces/{workspace.pk}/')
    assert resp.status_code == 403
    assert Workspace.objects.filter(pk=workspace.pk).exists()


def test_only_owner_can_rename_workspace(client_for, workspace):
    other = UserFactory()
    workspace.members.add(other)
    client = client_for(other)
    resp = client.patch(f'/api/workspaces/{workspace.pk}/', {'name': 'Renamed'}, format='json')
    assert resp.status_code == 403
    workspace.refresh_from_db()
    assert workspace.name != 'Renamed'


def test_owner_can_rename_workspace(auth_client, workspace):
    resp = auth_client.patch(f'/api/workspaces/{workspace.pk}/', {'name': 'Renamed OK'}, format='json')
    assert resp.status_code == 200
    workspace.refresh_from_db()
    assert workspace.name == 'Renamed OK'


def test_owner_can_remove_member(auth_client, workspace):
    member = UserFactory()
    workspace.members.add(member)
    resp = auth_client.post(f'/api/workspaces/{workspace.pk}/remove-member/', {'user_id': member.pk})
    assert resp.status_code == 200
    assert not workspace.members.filter(pk=member.pk).exists()


def test_cannot_remove_workspace_owner(auth_client, workspace, user):
    resp = auth_client.post(f'/api/workspaces/{workspace.pk}/remove-member/', {'user_id': user.pk})
    assert resp.status_code == 400
    assert workspace.members.filter(pk=user.pk).exists()


def test_members_endpoint_lists_all_members(auth_client, workspace, user):
    member = UserFactory()
    workspace.members.add(member)
    resp = auth_client.get(f'/api/workspaces/{workspace.pk}/members/')
    assert resp.status_code == 200
    ids = {m['id'] for m in resp.data}
    assert ids == {user.pk, member.pk}
