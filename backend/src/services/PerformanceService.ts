import { PerformanceRepository } from '../repositories/PerformanceRepository';

export class PerformanceService {
  private performanceRepo: PerformanceRepository;

  constructor() {
    this.performanceRepo = new PerformanceRepository();
  }

  async getEmployeePerformance(
    employeeId: string,
    periodStart?: Date,
    periodEnd?: Date
  ) {
    return await this.performanceRepo.calculatePerformance(
      employeeId,
      periodStart,
      periodEnd
    );
  }

  async getAllEmployeesPerformance(
    periodStart?: Date,
    periodEnd?: Date
  ) {
    return await this.performanceRepo.getAllEmployeesPerformance(
      periodStart,
      periodEnd
    );
  }

  async getHistoricalMetrics(employeeId: string, limit: number = 12) {
    return await this.performanceRepo.getHistoricalMetrics(employeeId, limit);
  }

  async savePerformanceSnapshot(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date
  ) {
    return await this.performanceRepo.saveSnapshot(
      employeeId,
      periodStart,
      periodEnd
    );
  }
}
