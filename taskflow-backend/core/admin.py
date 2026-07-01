from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Comment, Label, Task, User, Workspace


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'is_staff')
    ordering = ('email',)


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'member_count', 'created_at')
    list_select_related = ('owner',)
    filter_horizontal = ('members',)

    def member_count(self, obj):
        return obj.members.count()


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'task_list', 'priority', 'due_date', 'position', 'created_at')
    list_select_related = ('task_list',)
    filter_horizontal = ('assignees', 'labels')


@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'workspace', 'created_by')
    list_select_related = ('workspace', 'created_by')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('task', 'author', 'is_edited', 'created_at')
    list_select_related = ('task', 'author')
