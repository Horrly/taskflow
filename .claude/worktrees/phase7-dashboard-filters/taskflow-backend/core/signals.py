from django.db.models.signals import m2m_changed, post_delete, post_save, pre_delete, pre_save
from django.dispatch import receiver

from .models import ActivityLog, Comment, Label, Project, Task, TaskList, User, Workspace

# Tracks objects mid-cascade-delete in the current process. Needed because Django
# computes the SET_NULL/CASCADE cleanup list for related rows *before* sending
# delete signals — any ActivityLog row we create during that same cascade would
# be missed by that cleanup and left dangling, breaking the parent's DELETE.
# Skipping logging for anything under a pending delete avoids that.
_deleting_workspaces = set()
_deleting_projects = set()
_deleting_tasks = set()


@receiver(pre_delete, sender=Workspace)
def _mark_workspace_deleting(sender, instance, **kwargs):
    _deleting_workspaces.add(instance.pk)


@receiver(post_delete, sender=Workspace)
def _unmark_workspace_deleting(sender, instance, **kwargs):
    _deleting_workspaces.discard(instance.pk)


@receiver(pre_delete, sender=Project)
def _mark_project_deleting(sender, instance, **kwargs):
    _deleting_projects.add(instance.pk)


@receiver(post_delete, sender=Project)
def _unmark_project_deleting(sender, instance, **kwargs):
    _deleting_projects.discard(instance.pk)


def _actor(instance):
    return getattr(instance, '_current_user', None)


def _log(*, workspace, actor, verb, task=None, task_title='', project=None, project_name='', detail=''):
    if workspace.pk in _deleting_workspaces or (project and project.pk in _deleting_projects):
        return
    ActivityLog.objects.create(
        workspace=workspace,
        actor=actor,
        verb=verb,
        task=task,
        task_title=task_title,
        project=project,
        project_name=project_name,
        detail=detail,
    )


# ── Task field changes ───────────────────────────────────────────────────────

@receiver(pre_save, sender=Task)
def cache_old_task(sender, instance, **kwargs):
    if not instance.pk:
        instance._old = None
        return
    try:
        instance._old = Task.objects.get(pk=instance.pk)
    except Task.DoesNotExist:
        instance._old = None


@receiver(post_save, sender=Task)
def log_task_changes(sender, instance, created, **kwargs):
    project = instance.task_list.project
    workspace = project.workspace
    actor = _actor(instance)

    if created:
        _log(
            workspace=workspace, actor=actor, verb='created task',
            task=instance, task_title=instance.title,
            project=project, project_name=project.name,
        )
        return

    old = getattr(instance, '_old', None)
    if old is None:
        return

    if old.title != instance.title:
        _log(
            workspace=workspace, actor=actor, verb='renamed task',
            task=instance, task_title=instance.title,
            project=project, project_name=project.name,
            detail=f"from '{old.title}' to '{instance.title}'",
        )

    if old.task_list_id != instance.task_list_id:
        try:
            old_list_name = TaskList.objects.get(pk=old.task_list_id).name
        except TaskList.DoesNotExist:
            old_list_name = '?'
        _log(
            workspace=workspace, actor=actor, verb='moved task',
            task=instance, task_title=instance.title,
            project=project, project_name=project.name,
            detail=f"from '{old_list_name}' to '{instance.task_list.name}'",
        )

    if old.priority != instance.priority:
        _log(
            workspace=workspace, actor=actor, verb='changed priority',
            task=instance, task_title=instance.title,
            project=project, project_name=project.name,
            detail=f"to {instance.get_priority_display()}",
        )

    if old.due_date != instance.due_date:
        if instance.due_date is None:
            _log(
                workspace=workspace, actor=actor, verb='cleared due date',
                task=instance, task_title=instance.title,
                project=project, project_name=project.name,
            )
        else:
            # instance.due_date may be a raw string here (views assign it
            # straight from request JSON without parsing to a date object).
            _log(
                workspace=workspace, actor=actor, verb='set due date',
                task=instance, task_title=instance.title,
                project=project, project_name=project.name,
                detail=f"to {instance.due_date}",
            )


@receiver(pre_delete, sender=Task)
def log_task_deleted(sender, instance, **kwargs):
    _deleting_tasks.add(instance.pk)
    project = instance.task_list.project
    workspace = project.workspace
    # task=None (not instance): this row itself would otherwise become a
    # dangling reference the instant the task row is deleted right after.
    # The task_title/project snapshot already carries what's needed to display it.
    _log(
        workspace=workspace, actor=_actor(instance), verb='deleted task',
        task=None, task_title=instance.title,
        project=project, project_name=project.name,
    )


@receiver(post_delete, sender=Task)
def clear_task_deleting(sender, instance, **kwargs):
    _deleting_tasks.discard(instance.pk)


# ── Assignees / labels (M2M) ─────────────────────────────────────────────────

@receiver(m2m_changed, sender=Task.assignees.through)
def log_assignee_changes(sender, instance, action, pk_set, **kwargs):
    if action not in ('post_add', 'post_remove') or not pk_set:
        return
    project = instance.task_list.project
    workspace = project.workspace
    actor = _actor(instance)
    verb_prefix = 'assigned' if action == 'post_add' else 'unassigned'

    for user in User.objects.filter(pk__in=pk_set):
        name = f"{user.first_name} {user.last_name}".strip() or user.email
        _log(
            workspace=workspace, actor=actor, verb=f"{verb_prefix} {name}",
            task=instance, task_title=instance.title,
            project=project, project_name=project.name,
        )


@receiver(m2m_changed, sender=Task.labels.through)
def log_label_changes(sender, instance, action, pk_set, **kwargs):
    if action not in ('post_add', 'post_remove') or not pk_set:
        return
    project = instance.task_list.project
    workspace = project.workspace
    actor = _actor(instance)
    verb = 'added label' if action == 'post_add' else 'removed label'

    for label in Label.objects.filter(pk__in=pk_set):
        _log(
            workspace=workspace, actor=actor, verb=verb,
            task=instance, task_title=instance.title,
            project=project, project_name=project.name,
            detail=label.name,
        )


# ── Comments ─────────────────────────────────────────────────────────────────

@receiver(post_save, sender=Comment)
def log_comment_created(sender, instance, created, **kwargs):
    if not created:
        return
    task = instance.task
    project = task.task_list.project
    _log(
        workspace=project.workspace, actor=instance.author, verb='added comment',
        task=task, task_title=task.title,
        project=project, project_name=project.name,
    )


@receiver(post_delete, sender=Comment)
def log_comment_deleted(sender, instance, **kwargs):
    task = instance.task
    if task is None or task.pk in _deleting_tasks:
        return
    project = task.task_list.project
    _log(
        workspace=project.workspace, actor=instance.author, verb='deleted comment',
        task=task, task_title=task.title,
        project=project, project_name=project.name,
    )
