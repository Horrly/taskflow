from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    WorkspaceViewSet,
    project_detail,
    project_lists,
    tasklist_detail,
    tasklist_reorder,
    workspace_projects,
)

router = DefaultRouter()
router.register(r'workspaces', WorkspaceViewSet, basename='workspace')

urlpatterns = router.urls + [
    path('workspaces/<int:workspace_id>/projects/', workspace_projects, name='workspace-projects'),
    path('projects/<int:pk>/', project_detail, name='project-detail'),
    path('projects/<int:pk>/lists/', project_lists, name='project-lists'),
    path('lists/<int:pk>/', tasklist_detail, name='tasklist-detail'),
    path('lists/<int:pk>/reorder/', tasklist_reorder, name='tasklist-reorder'),
]
