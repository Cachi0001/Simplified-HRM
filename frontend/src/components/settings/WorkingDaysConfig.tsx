import React, { useState, useEffect } from "react";
import { Calendar, Clock, Save, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useToast } from "../ui/Toast";
import api from "../../lib/api";

interface WorkingDaysConfigProps {
  darkMode?: boolean;
  employeeId?: string;
}

interface WorkingDaysData {
  working_days: string[];
  working_hours: {
    start: string;
    end: string;
  };
  timezone: string;
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Asia/Shanghai", label: "China Standard Time (CST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

const WorkingDaysConfig: React.FC<WorkingDaysConfigProps> = ({
  darkMode = false,
  employeeId,
}) => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [workingDaysData, setWorkingDaysData] = useState<WorkingDaysData>({
    working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    working_hours: { start: "08:30", end: "17:00" },
    timezone: "UTC",
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Load current working days configuration
  useEffect(() => {
    const loadWorkingDaysConfig = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/employees/me/working-days");

        if (response.data.status === "success") {
          const config = response.data.data;
          setWorkingDaysData({
            working_days: config.working_days || [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
            ],
            working_hours: config.working_hours || {
              start: "09:00",
              end: "17:00",
            },
            timezone: config.timezone || "UTC",
          });
        }
      } catch (error) {
        console.error("Error loading working days config:", error);
        // Fallback to profile endpoint
        try {
          const profileResponse = await api.get("/employees/me");
          if (profileResponse.data.status === "success") {
            const employee = profileResponse.data.data.employee;
            setWorkingDaysData({
              working_days: employee.work_days || [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
              ],
              working_hours: employee.working_hours || {
                start: "09:00",
                end: "17:00",
              },
              timezone: employee.timezone || "UTC",
            });
          }
        } catch (fallbackError) {
          addToast("error", "Failed to load working days configuration");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkingDaysConfig();
  }, [employeeId, addToast]);

  // Handle working day toggle
  const handleDayToggle = (dayKey: string) => {
    setWorkingDaysData((prev) => {
      const newWorkingDays = prev.working_days.includes(dayKey)
        ? prev.working_days.filter((day) => day !== dayKey)
        : [...prev.working_days, dayKey];

      setHasChanges(true);
      return {
        ...prev,
        working_days: newWorkingDays,
      };
    });
  };

  // Handle working hours change
  const handleWorkingHoursChange = (field: "start" | "end", value: string) => {
    setWorkingDaysData((prev) => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  // Handle timezone change
  const handleTimezoneChange = (timezone: string) => {
    setWorkingDaysData((prev) => ({
      ...prev,
      timezone,
    }));
    setHasChanges(true);
  };

  // Validate configuration
  const validateConfig = (): string[] => {
    const errors: string[] = [];

    if (workingDaysData.working_days.length === 0) {
      errors.push("At least one working day must be selected");
    }

    if (workingDaysData.working_days.length > 7) {
      errors.push("Cannot have more than 7 working days");
    }

    const startTime = new Date(
      `2000-01-01T${workingDaysData.working_hours.start}:00`,
    );
    const endTime = new Date(
      `2000-01-01T${workingDaysData.working_hours.end}:00`,
    );

    if (startTime >= endTime) {
      errors.push("Start time must be before end time");
    }

    return errors;
  };

  // Save configuration
  const handleSave = async () => {
    const validationErrors = validateConfig();
    if (validationErrors.length > 0) {
      addToast("error", validationErrors[0] || "Validation error");
      return;
    }

    try {
      setIsSaving(true);

      const response = await api.put("/employees/me", {
        work_days: workingDaysData.working_days,
        working_hours: workingDaysData.working_hours,
        timezone: workingDaysData.timezone,
      });

      if (response.data.status === "success") {
        setHasChanges(false);
        addToast("success", "Working days configuration saved successfully!");
      }
    } catch (error: any) {
      console.error("Error saving working days config:", error);
      addToast(
        "error",
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Failed to save working days configuration",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setWorkingDaysData({
      working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      working_hours: { start: "09:00", end: "17:00" },
      timezone: "UTC",
    });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <Card
        className={`p-6 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <div className="animate-pulse">
          <div
            className={`h-4 rounded mb-4 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
          ></div>
          <div
            className={`h-20 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
          ></div>
        </div>
      </Card>
    );
  }

  const validationErrors = validateConfig();

  return (
    <Card
      className={`p-6 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Calendar
            className={`h-5 w-5 ${darkMode ? "text-blue-400" : "text-blue-600"}`}
          />
          <h3
            className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            Working Days Configuration
          </h3>
        </div>

        {/* Working Days Selection */}
        <div>
          <label
            className={`block text-sm font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            Select Your Working Days
          </label>
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = workingDaysData.working_days.includes(day.key);
              return (
                <button
                  key={day.key}
                  onClick={() => handleDayToggle(day.key)}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? `${darkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white"}`
                      : `${darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`
                  }`}
                >
                  <div className="text-xs">{day.short}</div>
                  <div className="text-xs mt-1">{day.label.slice(0, 3)}</div>
                </button>
              );
            })}
          </div>
          <p
            className={`text-xs mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            Selected: {workingDaysData.working_days.length} day
            {workingDaysData.working_days.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Working Hours */}
        <div>
          <label
            className={`block text-sm font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            <Clock className="inline h-4 w-4 mr-1" />
            Working Hours
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className={`block text-xs font-medium mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Start Time
              </label>
              <input
                type="time"
                value={workingDaysData.working_hours.start}
                onChange={(e) =>
                  handleWorkingHoursChange("start", e.target.value)
                }
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                    : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
            </div>
            <div>
              <label
                className={`block text-xs font-medium mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                End Time
              </label>
              <input
                type="time"
                value={workingDaysData.working_hours.end}
                onChange={(e) =>
                  handleWorkingHoursChange("end", e.target.value)
                }
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                    : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
            </div>
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            Timezone
          </label>
          <select
            value={workingDaysData.timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border transition-colors ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div
            className={`p-3 rounded-lg ${darkMode ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"} border`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span
                className={`text-sm font-medium ${darkMode ? "text-red-400" : "text-red-800"}`}
              >
                Configuration Issues:
              </span>
            </div>
            <ul
              className={`mt-2 text-sm ${darkMode ? "text-red-300" : "text-red-700"}`}
            >
              {validationErrors.map((error, index) => (
                <li key={index} className="ml-4">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Success Message */}
        {!hasChanges && !isLoading && (
          <div
            className={`p-3 rounded-lg ${darkMode ? "bg-green-900/20 border-green-800" : "bg-green-50 border-green-200"} border`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span
                className={`text-sm ${darkMode ? "text-green-400" : "text-green-800"}`}
              >
                Configuration saved and up to date
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || validationErrors.length > 0}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
            className={
              darkMode ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""
            }
          >
            Reset to Default
          </Button>
        </div>

        {/* Info */}
        <div
          className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
        >
          <p>
            • Working days configuration affects performance calculations and
            attendance tracking
          </p>
          <p>
            • Changes take effect immediately and will be used for future
            calculations
          </p>
          <p>
            • Your timezone setting ensures accurate time-based calculations
          </p>
        </div>
      </div>
    </Card>
  );
};

export default WorkingDaysConfig;
