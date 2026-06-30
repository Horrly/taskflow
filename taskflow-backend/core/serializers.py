from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from .models import Task, User, Workspace, Project, TaskList


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('email', 'password', 'first_name', 'last_name')

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'avatar', 'date_joined')
        read_only_fields = ('id', 'date_joined')


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'avatar')


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = WorkspaceMemberSerializer(read_only=True)
    members = WorkspaceMemberSerializer(many=True, read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ('id', 'name', 'owner', 'members', 'member_count', 'created_at')
        read_only_fields = ('id', 'owner', 'members', 'member_count', 'created_at')

    def get_member_count(self, obj):
        return obj.members.count()


class WorkspaceListSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ('id', 'name', 'member_count', 'created_at')

    def get_member_count(self, obj):
        return obj.members.count()


class TaskSerializer(serializers.ModelSerializer):
    assignees = WorkspaceMemberSerializer(many=True, read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ('id', 'title', 'priority', 'due_date', 'position', 'assignees', 'comment_count')

    def get_comment_count(self, obj):
        return 0


class TaskDetailSerializer(serializers.ModelSerializer):
    assignees = WorkspaceMemberSerializer(many=True, read_only=True)
    created_by = WorkspaceMemberSerializer(read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            'id', 'task_list_id', 'title', 'description', 'priority', 'due_date',
            'position', 'assignees', 'created_by', 'created_at', 'updated_at',
            'comment_count',
        )
        read_only_fields = ('id', 'task_list_id', 'position', 'created_by', 'created_at', 'updated_at')

    def get_comment_count(self, obj):
        return 0


class TaskListSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta:
        model = TaskList
        fields = ('id', 'name', 'position', 'color', 'tasks')
        read_only_fields = ('id', 'position')


class ProjectListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ('id', 'name', 'description', 'status', 'due_date', 'created_at')
        read_only_fields = ('id', 'created_at')


class ProjectSerializer(serializers.ModelSerializer):
    task_lists = TaskListSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ('id', 'name', 'description', 'status', 'due_date', 'created_at', 'task_lists')
        read_only_fields = ('id', 'created_at')


class ProjectWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ('name', 'description', 'status', 'due_date')
