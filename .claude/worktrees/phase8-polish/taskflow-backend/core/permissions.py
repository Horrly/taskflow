from rest_framework.permissions import BasePermission


class IsWorkspaceMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.members.filter(pk=request.user.pk).exists()


class IsWorkspaceOwner(BasePermission):
    message = 'Only the workspace owner can perform this action.'

    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.pk
