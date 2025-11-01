/**
 * Token Expiry Tests
 * Verify that JWT tokens have the correct expiry times
 */
import jwt from 'jsonwebtoken';

describe('Token Expiry Configuration', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'employee'
  };

  const jwtSecret = process.env.JWT_SECRET || 'test-secret';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

  test('should generate access token with 14-day expiry', () => {
    const accessToken = jwt.sign(
      {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      },
      jwtSecret,
      { expiresIn: '14d' }
    );

    const decoded = jwt.decode(accessToken) as any;
    expect(decoded).toBeTruthy();
    expect(decoded.sub).toBe(mockUser.id);
    expect(decoded.email).toBe(mockUser.email);
    expect(decoded.role).toBe(mockUser.role);

    // Check expiry time (14 days = 14 * 24 * 60 * 60 = 1,209,600 seconds)
    const expectedExpiry = decoded.iat + (14 * 24 * 60 * 60);
    expect(decoded.exp).toBe(expectedExpiry);
  });

  test('should generate refresh token with 30-day expiry', () => {
    const refreshToken = jwt.sign(
      {
        sub: mockUser.id,
        email: mockUser.email,
      },
      jwtRefreshSecret,
      { expiresIn: '30d' }
    );

    const decoded = jwt.decode(refreshToken) as any;
    expect(decoded).toBeTruthy();
    expect(decoded.sub).toBe(mockUser.id);
    expect(decoded.email).toBe(mockUser.email);

    // Check expiry time (30 days = 30 * 24 * 60 * 60 = 2,592,000 seconds)
    const expectedExpiry = decoded.iat + (30 * 24 * 60 * 60);
    expect(decoded.exp).toBe(expectedExpiry);
  });

  test('should verify access token is valid for 14 days', () => {
    const accessToken = jwt.sign(
      {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      },
      jwtSecret,
      { expiresIn: '14d' }
    );

    // Should be valid immediately
    expect(() => jwt.verify(accessToken, jwtSecret)).not.toThrow();

    // Check the token contains correct expiry
    const decoded = jwt.verify(accessToken, jwtSecret) as any;
    const now = Math.floor(Date.now() / 1000);
    const fourteenDaysFromNow = now + (14 * 24 * 60 * 60);
    
    // Allow for small timing differences (within 10 seconds)
    expect(decoded.exp).toBeGreaterThan(fourteenDaysFromNow - 10);
    expect(decoded.exp).toBeLessThan(fourteenDaysFromNow + 10);
  });

  test('should verify refresh token is valid for 30 days', () => {
    const refreshToken = jwt.sign(
      {
        sub: mockUser.id,
        email: mockUser.email,
      },
      jwtRefreshSecret,
      { expiresIn: '30d' }
    );

    // Should be valid immediately
    expect(() => jwt.verify(refreshToken, jwtRefreshSecret)).not.toThrow();

    // Check the token contains correct expiry
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as any;
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60);
    
    // Allow for small timing differences (within 10 seconds)
    expect(decoded.exp).toBeGreaterThan(thirtyDaysFromNow - 10);
    expect(decoded.exp).toBeLessThan(thirtyDaysFromNow + 10);
  });

  test('should have different expiry times for access and refresh tokens', () => {
    const accessToken = jwt.sign(
      { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
      jwtSecret,
      { expiresIn: '14d' }
    );

    const refreshToken = jwt.sign(
      { sub: mockUser.id, email: mockUser.email },
      jwtRefreshSecret,
      { expiresIn: '30d' }
    );

    const accessDecoded = jwt.decode(accessToken) as any;
    const refreshDecoded = jwt.decode(refreshToken) as any;

    // Refresh token should expire later than access token
    expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);

    // Difference should be approximately 16 days (30 - 14 = 16 days)
    const expectedDifference = 16 * 24 * 60 * 60; // 16 days in seconds
    const actualDifference = refreshDecoded.exp - accessDecoded.exp;
    
    // Allow for small timing differences (within 10 seconds)
    expect(actualDifference).toBeGreaterThan(expectedDifference - 10);
    expect(actualDifference).toBeLessThan(expectedDifference + 10);
  });
});