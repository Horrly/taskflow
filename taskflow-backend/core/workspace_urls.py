from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    WorkspaceViewSet,
    comment_detail,
    label_detail,
    list_tasks,
    my_activity,
    project_detail,
    project_lists,
    task_activity,
    task_add_label,
    task_comments,
    task_detail,
    task_move,
    task_remove_label,
    tasklist_detail,
    tasklist_reorder,
    workspace_activity,
    workspace_labels,
    workspace_projects,
)

router = DefaultRouter()
router.register(r'workspaces', WorkspaceViewSet, basename='workspace')

urlpatterns = router.urls + [
    path('workspaces/<int:workspace_id>/projects/', workspace_projects, name='workspace-projects'),
    path('workspaces/<int:workspace_id>/labels/', workspace_labels, name='workspace-labels'),
    path('workspaces/<int:workspace_id>/activity/', workspace_activity, name='workspace-activity'),
    path('projects/<int:pk>/', project_detail, name='project-detail'),
    path('projects/<int:pk>/lists/', project_lists, name='project-lists'),
    path('lists/<int:pk>/', tasklist_detail, name='tasklist-detail'),
    path('lists/<int:pk>/reorder/', tasklist_reorder, name='tasklist-reorder'),
    path('lists/<int:list_id>/tasks/', list_tasks, name='list-tasks'),
    path('tasks/<int:pk>/', task_detail, name='task-detail'),
    path('tasks/<int:pk>/move/', task_move, name='task-move'),
    path('tasks/<int:task_id>/labels/', task_add_label, name='task-add-label'),
    path('tasks/<int:task_id>/labels/<int:label_id>/', task_remove_label, name='task-remove-label'),
    path('tasks/<int:task_id>/comments/', task_comments, name='task-comments'),
    path('tasks/<int:task_id>/activity/', task_activity, name='task-activity'),
    path('comments/<int:pk>/', comment_detail, name='comment-detail'),
    path('labels/<int:pk>/', label_detail, name='label-detail'),
    path('me/activity/', my_activity, name='my-activity'),
]
