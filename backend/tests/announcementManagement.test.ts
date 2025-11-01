import { Pool } from 'pg';
import { AnnouncementService } from '../src/services/AnnouncementService';
import { WebSocketService } from '../src/services/WebSocketService';
import { CreateAnnouncementRequest, UpdateAnnouncementRequest } from '../src/models/Announcement';
import { createServer } from 'http';

// Mock WebSocket service
class MockWebSocketService {
  broadcast(event: string, data: any): void {
    // Mock implementation
  }
  
  sendToUser(userId: string, event: string, data: any): void {
    // Mock implementation
  }
  
  setIO(io: any): void {
    // Mock implementation
  }
}

describe('AnnouncementService', () => {
  let db: Pool;
  let announcementService: AnnouncementService;
  let mockWsService: MockWebSocketService;
  let testUserId: string;
  let testAnnouncementId: string;

  beforeAll(async () => {
    // Initialize test database connection
    db = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/go3net_test',
      ssl: false
    });

    mockWsService = new MockWebSocketService();
    announcementService = new AnnouncementService(db, mockWsService as any);

    // Create a test user
    const client = await db.connect();
    try {
      const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash, status) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        ['Test User', 'test@example.com', 'hashedpassword', 'active']
      );
      testUserId = userResult.rows[0].id;
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    // Clean up test data
    const client = await db.connect();
    try {
      await client.query('DELETE FROM announcements WHERE author_id = $1', [testUserId]);
      await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
    } finally {
      client.release();
    }
    
    await db.end();
  });

  describe('createAnnouncement', () => {
    it('should create a new announcement successfully', async () => {
      const announcementData: CreateAnnouncementRequest = {
        title: 'Test Announcement',
        content: 'This is a test announcement content.',
        priority: 'medium',
        target_type: 'all'
      };

      const announcement = await announcementService.createAnnouncement(announcementData, testUserId);
      testAnnouncementId = announcement.id;

      expect(announcement).toBeDefined();
      expect(announcement.title).toBe(announcementData.title);
      expect(announcement.content).toBe(announcementData.content);
      expect(announcement.priority).toBe(announcementData.priority);
      expect(announcement.author_id).toBe(testUserId);
      expect(announcement.status).toBe('draft');
    });

    it('should create announcement with scheduling', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const announcementData: CreateAnnouncementRequest = {
        title: 'Scheduled Announcement',
        content: 'This announcement is scheduled for later.',
        priority: 'high',
        scheduled_at: futureDate,
        target_type: 'all'
      };

      const announcement = await announcementService.createAnnouncement(announcementData, testUserId);

      expect(announcement).toBeDefined();
      expect(announcement.scheduled_at).toBeDefined();
      expect(new Date(announcement.scheduled_at!)).toEqual(futureDate);
    });
  });

  describe('getAnnouncements', () => {
    it('should retrieve announcements with filters', async () => {
      const announcements = await announcementService.getAnnouncements({
        author_id: testUserId
      });

      expect(Array.isArray(announcements)).toBe(true);
      expect(announcements.length).toBeGreaterThan(0);
      expect(announcements[0].author_id).toBe(testUserId);
    });

    it('should retrieve announcements with priority filter', async () => {
      const announcements = await announcementService.getAnnouncements({
        priority: ['medium']
      });

      expect(Array.isArray(announcements)).toBe(true);
      announcements.forEach(announcement => {
        expect(announcement.priority).toBe('medium');
      });
    });
  });

  describe('updateAnnouncement', () => {
    it('should update announcement successfully', async () => {
      const updateData: UpdateAnnouncementRequest = {
        title: 'Updated Test Announcement',
        priority: 'high'
      };

      const updatedAnnouncement = await announcementService.updateAnnouncement(testAnnouncementId, updateData);

      expect(updatedAnnouncement).toBeDefined();
      expect(updatedAnnouncement!.title).toBe(updateData.title);
      expect(updatedAnnouncement!.priority).toBe(updateData.priority);
    });

    it('should return null for non-existent announcement', async () => {
      const updateData: UpdateAnnouncementRequest = {
        title: 'Non-existent Announcement'
      };

      const result = await announcementService.updateAnnouncement('non-existent-id', updateData);
      expect(result).toBeNull();
    });
  });

  describe('publishAnnouncement', () => {
    it('should publish announcement successfully', async () => {
      const publishedAnnouncement = await announcementService.publishAnnouncement(testAnnouncementId);

      expect(publishedAnnouncement).toBeDefined();
      expect(publishedAnnouncement!.status).toBe('published');
      expect(publishedAnnouncement!.published_at).toBeDefined();
    });
  });

  describe('reactions', () => {
    it('should add reaction to announcement', async () => {
      const reaction = await announcementService.addReaction(testAnnouncementId, testUserId, 'like');

      expect(reaction).toBeDefined();
      expect(reaction.announcement_id).toBe(testAnnouncementId);
      expect(reaction.user_id).toBe(testUserId);
      expect(reaction.reaction_type).toBe('like');
    });

    it('should remove reaction from announcement', async () => {
      const removed = await announcementService.removeReaction(testAnnouncementId, testUserId, 'like');
      expect(removed).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('should mark announcement as read', async () => {
      const readStatus = await announcementService.markAsRead(testAnnouncementId, testUserId);

      expect(readStatus).toBeDefined();
      expect(readStatus.announcement_id).toBe(testAnnouncementId);
      expect(readStatus.user_id).toBe(testUserId);
    });
  });

  describe('getAnnouncementStats', () => {
    it('should get announcement statistics', async () => {
      const stats = await announcementService.getAnnouncementStats(testAnnouncementId);

      expect(stats).toBeDefined();
      expect(typeof stats.total_reactions).toBe('number');
      expect(typeof stats.total_reads).toBe('number');
      expect(typeof stats.read_percentage).toBe('number');
    });
  });

  describe('templates', () => {
    let testTemplateId: string;

    it('should create announcement template', async () => {
      const templateData = {
        name: 'Test Template',
        title_template: 'Template Title: {title}',
        content_template: 'Template Content: {content}',
        default_priority: 'medium' as const,
        category: 'general',
        created_by: testUserId
      };

      const template = await announcementService.createTemplate(templateData);
      testTemplateId = template.id;

      expect(template).toBeDefined();
      expect(template.name).toBe(templateData.name);
      expect(template.title_template).toBe(templateData.title_template);
      expect(template.content_template).toBe(templateData.content_template);
    });

    it('should retrieve templates', async () => {
      const templates = await announcementService.getTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      const testTemplate = templates.find(t => t.id === testTemplateId);
      expect(testTemplate).toBeDefined();
    });

    afterAll(async () => {
      // Clean up template
      if (testTemplateId) {
        const client = await db.connect();
        try {
          await client.query('DELETE FROM announcement_templates WHERE id = $1', [testTemplateId]);
        } finally {
          client.release();
        }
      }
    });
  });

  describe('scheduled announcements processing', () => {
    it('should process scheduled announcements', async () => {
      // Create a scheduled announcement that should be published now
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 1);

      const announcementData: CreateAnnouncementRequest = {
        title: 'Past Scheduled Announcement',
        content: 'This should be published automatically.',
        priority: 'medium',
        scheduled_at: pastDate,
        target_type: 'all'
      };

      const announcement = await announcementService.createAnnouncement(announcementData, testUserId);
      
      // Update status to scheduled
      await announcementService.updateAnnouncement(announcement.id, { status: 'scheduled' });

      // Process scheduled announcements
      await announcementService.processScheduledAnnouncements();

      // Check if announcement was published
      const updatedAnnouncement = await announcementService.getAnnouncementById(announcement.id);
      expect(updatedAnnouncement!.status).toBe('published');
    });
  });

  describe('announcement expiry', () => {
    it('should expire announcements', async () => {
      // Create an announcement that should be expired
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 1);

      const announcementData: CreateAnnouncementRequest = {
        title: 'Expiring Announcement',
        content: 'This should be expired automatically.',
        priority: 'medium',
        expires_at: pastDate,
        target_type: 'all'
      };

      const announcement = await announcementService.createAnnouncement(announcementData, testUserId);
      
      // Publish the announcement first
      await announcementService.publishAnnouncement(announcement.id);

      // Process expiry
      await announcementService.expireAnnouncements();

      // Check if announcement was expired
      const updatedAnnouncement = await announcementService.getAnnouncementById(announcement.id);
      expect(updatedAnnouncement!.status).toBe('expired');
    });
  });
});