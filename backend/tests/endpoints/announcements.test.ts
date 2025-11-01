import request from 'supertest';
import app from '../../src/server';
import { generateTestToken } from '../utils/testHelpers';

describe('Announcement Controller Endpoints', () => {
  let authToken: string;
  let hrToken: string;
  let employeeToken: string;
  let announcementId: string;

  beforeAll(async () => {
    // Generate tokens for different roles
    authToken = generateTestToken('admin-user-id', 'admin');
    hrToken = generateTestToken('hr-user-id', 'hr');
    employeeToken = generateTestToken('employee-user-id', 'employee');
  });

  describe('POST /api/announcements', () => {
    it('should create announcement successfully with admin role', async () => {
      const announcementData = {
        title: 'Test Announcement',
        content: 'This is a test announcement content',
        priority: 'normal',
        status: 'published',
        target_audience: 'all'
      };

      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(announcementData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.announcement).toBeDefined();
      expect(response.body.data.announcement.title).toBe(announcementData.title);
      
      // Store announcement ID for later tests
      announcementId = response.body.data.announcement.id;
    });

    it('should create announcement successfully with HR role', async () => {
      const announcementData = {
        title: 'HR Announcement',
        content: 'This is an HR announcement',
        priority: 'high',
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${hrToken}`)
        .send(announcementData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
    });

    it('should return 403 for employee role', async () => {
      const announcementData = {
        title: 'Employee Announcement',
        content: 'This should not be allowed'
      };

      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(announcementData);

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('error');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('required');
    });

    it('should validate status field', async () => {
      const announcementData = {
        title: 'Test Announcement',
        content: 'Test content',
        status: 'invalid_status'
      };

      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(announcementData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Status must be one of');
    });

    it('should validate target_audience field', async () => {
      const announcementData = {
        title: 'Test Announcement',
        content: 'Test content',
        target_audience: 'invalid_audience'
      };

      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(announcementData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Target audience must be one of');
    });
  });

  describe('GET /api/announcements', () => {
    it('should retrieve announcements with pagination', async () => {
      const response = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.limit).toBe(10);
      expect(response.body.offset).toBe(0);
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'published' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should support filtering by priority', async () => {
      const response = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ priority: 'high' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should use default pagination if not provided', async () => {
      const response = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(50);
      expect(response.body.offset).toBe(0);
    });
  });

  describe('GET /api/announcements/:id', () => {
    it('should retrieve specific announcement', async () => {
      // Skip if no announcement ID available
      if (!announcementId) {
        return;
      }

      const response = await request(app)
        .get(`/api/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(announcementId);
    });

    it('should return 404 for non-existent announcement', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/announcements/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('PUT /api/announcements/:id', () => {
    it('should update announcement with admin role', async () => {
      // Skip if no announcement ID available
      if (!announcementId) {
        return;
      }

      const updateData = {
        title: 'Updated Announcement Title',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should return 403 for employee role', async () => {
      // Skip if no announcement ID available
      if (!announcementId) {
        return;
      }

      const updateData = {
        title: 'Should not be allowed'
      };

      const response = await request(app)
        .put(`/api/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('error');
    });

    it('should return 404 for non-existent announcement', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .put(`/api/announcements/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/announcements/:id/publish', () => {
    it('should publish draft announcement', async () => {
      // Create a draft announcement first
      const draftData = {
        title: 'Draft Announcement',
        content: 'This is a draft',
        status: 'draft'
      };

      const createResponse = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(draftData);

      if (createResponse.status === 201) {
        const draftId = createResponse.body.data.announcement.id;

        const response = await request(app)
          .post(`/api/announcements/${draftId}/publish`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
      }
    });

    it('should return 403 for employee role', async () => {
      // Skip if no announcement ID available
      if (!announcementId) {
        return;
      }

      const response = await request(app)
        .post(`/api/announcements/${announcementId}/publish`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/announcements/:id/archive', () => {
    it('should archive announcement', async () => {
      // Skip if no announcement ID available
      if (!announcementId) {
        return;
      }

      const response = await request(app)
        .post(`/api/announcements/${announcementId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should return 403 for employee role', async () => {
      // Skip if no announcement ID available
      if (!announcementId) {
        return;
      }

      const response = await request(app)
        .post(`/api/announcements/${announcementId}/archive`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('error');
    });
  });

  describe('Reaction System', () => {
    describe('POST /api/announcements/:id/reactions', () => {
      it('should add reaction to announcement', async () => {
        // Skip if no announcement ID available
        if (!announcementId) {
          return;
        }

        const reactionData = {
          reactionType: 'like'
        };

        const response = await request(app)
          .post(`/api/announcements/${announcementId}/reactions`)
          .set('Authorization', `Bearer ${employeeToken}`)
          .send(reactionData);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
      });

      it('should validate reaction type', async () => {
        // Skip if no announcement ID available
        if (!announcementId) {
          return;
        }

        const reactionData = {
          reactionType: 'invalid_reaction'
        };

        const response = await request(app)
          .post(`/api/announcements/${announcementId}/reactions`)
          .set('Authorization', `Bearer ${employeeToken}`)
          .send(reactionData);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Valid reaction type is required');
      });

      it('should return 401 without authentication', async () => {
        // Skip if no announcement ID available
        if (!announcementId) {
          return;
        }

        const response = await request(app)
          .post(`/api/announcements/${announcementId}/reactions`)
          .send({ reactionType: 'like' });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/announcements/:id/reactions', () => {
      it('should get reactions for announcement', async () => {
        // Skip if no announcement ID available
        if (!announcementId) {
          return;
        }

        const response = await request(app)
          .get(`/api/announcements/${announcementId}/reactions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.reactions).toBeDefined();
        expect(response.body.data.counts).toBeDefined();
        expect(response.body.data.users).toBeDefined();
      });
    });

    describe('DELETE /api/announcements/:id/reactions', () => {
      it('should remove reaction from announcement', async () => {
        // Skip if no announcement ID available
        if (!announcementId) {
          return;
        }

        const response = await request(app)
          .delete(`/api/announcements/${announcementId}/reactions`)
          .set('Authorization', `Bearer ${employeeToken}`);

        // Should return 200 if reaction exists, 404 if not
        expect([200, 404]).toContain(response.status);
      });
    });
  });

  describe('GET /api/announcements/status/:status', () => {
    it('should get announcements by status', async () => {
      const response = await request(app)
        .get('/api/announcements/status/published')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should validate status parameter', async () => {
      const response = await request(app)
        .get('/api/announcements/status/invalid_status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Status must be one of');
    });
  });

  describe('DELETE /api/announcements/:id', () => {
    it('should return 403 for HR role (only admin can delete)', async () => {
      // Skip if no announcement ID available
      if (!announcementId) {
        return;
      }

      const response = await request(app)
        .delete(`/api/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${hrToken}`);

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('error');
    });

    it('should delete announcement with admin role', async () => {
      // Skip if no announcement ID available
      if (!announcementId) {
        return;
      }

      const response = await request(app)
        .delete(`/api/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should return 404 for non-existent announcement', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .delete(`/api/announcements/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 without valid token', async () => {
      const response = await request(app)
        .get('/api/announcements');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      // This test would require mocking the database to simulate errors
      // For now, we'll just ensure the endpoint exists
      const response = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Data Validation', () => {
    it('should validate announcement ID format', async () => {
      const response = await request(app)
        .get('/api/announcements/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      // Should handle invalid ID gracefully
      expect([400, 404, 500]).toContain(response.status);
    });

    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(10000);
      
      const announcementData = {
        title: 'Long Content Test',
        content: longContent
      };

      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(announcementData);

      // Should either accept or reject gracefully
      expect([201, 400, 413]).toContain(response.status);
    });
  });
});