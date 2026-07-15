import pytest

from core.models import User
from core.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


def test_register_valid_returns_201_with_tokens(api_client):
    resp = api_client.post('/api/auth/register/', {
        'email': 'newuser@example.com',
        'password': 'S3cur3-Passw0rd!',
        'first_name': 'New',
        'last_name': 'User',
    })
    assert resp.status_code == 201
    assert resp.data['user']['email'] == 'newuser@example.com'
    assert 'access' in resp.data
    assert 'refresh' in resp.data
    assert User.objects.filter(email='newuser@example.com').exists()


def test_register_duplicate_email_returns_400(api_client):
    UserFactory(email='dupe@example.com')
    resp = api_client.post('/api/auth/register/', {
        'email': 'dupe@example.com',
        'password': 'S3cur3-Passw0rd!',
        'first_name': 'A',
        'last_name': 'B',
    })
    assert resp.status_code == 400


def test_register_weak_password_returns_400(api_client):
    resp = api_client.post('/api/auth/register/', {
        'email': 'weak@example.com',
        'password': '12345678',
        'first_name': 'A',
        'last_name': 'B',
    })
    assert resp.status_code == 400


def test_login_correct_credentials_returns_200_with_tokens(api_client):
    UserFactory(email='login@example.com', password='CorrectPass123!')
    resp = api_client.post('/api/auth/login/', {
        'email': 'login@example.com',
        'password': 'CorrectPass123!',
    })
    assert resp.status_code == 200
    assert 'access' in resp.data
    assert 'refresh' in resp.data
    assert resp.data['user']['email'] == 'login@example.com'


def test_login_wrong_password_returns_401(api_client):
    UserFactory(email='login2@example.com', password='CorrectPass123!')
    resp = api_client.post('/api/auth/login/', {
        'email': 'login2@example.com',
        'password': 'WrongPassword!',
    })
    assert resp.status_code == 401
    assert resp.data == {'detail': 'Invalid credentials.'}


def test_me_with_token_returns_correct_data(auth_client, user):
    resp = auth_client.get('/api/auth/me/')
    assert resp.status_code == 200
    assert resp.data['email'] == user.email


def test_me_without_token_returns_401(api_client):
    resp = api_client.get('/api/auth/me/')
    assert resp.status_code == 401
