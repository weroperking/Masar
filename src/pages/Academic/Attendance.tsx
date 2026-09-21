import { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import {
  Play,
  CheckCircle,
  Clock,
  X,
  Users,
  MessageCircle,
  StopCircle,
  Calendar,
  AlertTriangle,
  QrCode,
  Check,
  Search,
  UserCheck,
  UserX,
  Trash2,
  ArrowRight,
  RefreshCw,
  Zap,
  Camera,
  Image,
} from "lucide-react";
import {
  ScannedStudentBottomSheet,
  ScannedStudentDesktopCard,
  ScannedStudentData,
} from "../../components/Attendance/ScannedStudentInfo";
import { CameraScanner } from "../../components/Attendance/CameraScanner";
import { useApiQuery, useApiMutation } from "../../config/queryHooks";
import {
  AttendanceSession,
  Student,
  Group,
  Course,
  AttendanceRecord,
} from "../../types";
import {
  formatTime12,
  formatTimeRange12,
  formatTimestamp12,
} from "../../utils/time";
import { extractStudentCodeFromScanned } from "../../utils/studentCode";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { getWhatsAppUrl } from "../../utils/phone";
import { autoScheduleService } from "../../services/autoScheduleService";
import { motion, AnimatePresence } from "motion/react";

export function Attendance() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<
    "live" | "upcoming" | "history" | "absent"
  >("live");
  const [markingSession, setMarkingSession] =
    useState<AttendanceSession | null>(null);
  const [startWithCamera, setStartWithCamera] = useState(false);
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const { data: groups = [] } = useApiQuery<Group>("groups", 60 * 1000);
  const { data: courses = [] } = useApiQuery<Course>("courses", 60 * 1000);

  // Periodic auto-check when on attendance page
  useEffect(() => {
    autoScheduleService.checkAndRunSchedules();
    const timer = setInterval(() => {
      autoScheduleService.checkAndRunSchedules();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleManualAutoCheck = async () => {
    setIsAutoChecking(true);
    try {
      const result = await autoScheduleService.checkAndRunSchedules();
      if (result.started > 0) {
        toast.success(`تم بدء ${result.started} حصة تلقائياً وفقاً للجدول الزمني!`);
      } else {
        toast.info("تم فحص الجدول: لا توجد حصص جديدة حان موعد بدئها الآن.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("حدث خطأ أثناء فحص الحصص المجدولة.");
    } finally {
      setIsAutoChecking(false);
    }
  };

  const { data: allSessions = [] } = useApiQuery<AttendanceSession>(
    "attendanceSessions",
    30 * 1000,
  );
  const activeSessions = allSessions.filter((s) => s.status === "live");
  const completedSessions = allSessions.filter((s) => s.status === "completed");

  const { data: allRecords = [] } = useApiQuery<AttendanceRecord>(
    "attendanceRecords",
    30 * 1000,
  );
  const { data: allStudents = [] } = useApiQuery<Student>(
    "students",
    60 * 1000,
  );
  const students = allStudents.filter((s) => !s.deleted_at);

  const { create: createSession, update: updateSession } =
    useApiMutation<AttendanceSession>("attendanceSessions");

  const courseMap = new Map(courses?.map((c) => [c.id, c.name]));
  const groupMap = new Map(groups?.map((g) => [g.id, g]));

  const handleStartSession = async (
    groupId: string,
    courseId: string,
    isTrial: boolean = false,
  ) => {
    createSession.mutate(
      {
        groupId,
        courseId,
        isTrial,
        startedAt: Date.now(),
        endedAt: null,
        status: "live",
      },
      {
        onSuccess: () =>
          toast.success(
            isTrial ? "تم بدء حصة تجريبية بنجاح!" : "تم بدء الحصة بنجاح!",
          ),
        onError: (err: any) =>
          toast.error("حدث خطأ: " + (err.message || "فشل في بدء الحصة")),
      },
    );
  };

  const handleEndSession = async (sessionId: string) => {
    const isConfirmed = await confirm({
      title: "إنهاء وتوثيق الحصة",
      message: "هل أنت متأكد من إنهاء هذه الحصة الحالية؟",
      description:
        "لا يمكن التعديل على سجل الحضور والغياب لهذه الحصة بعد إتمام الإنهاء.",
      confirmText: "نعم، إنهاء الحصة",
      cancelText: "تراجع",
      variant: "warning",
    });

    if (isConfirmed) {
      const targetSession = allSessions.find((s) => s.id === sessionId);
      if (targetSession?.groupId) {
        autoScheduleService.markSessionCancelledOrEnded(targetSession.groupId);
      }
      updateSession.mutate(
        {
          id: sessionId,
          data: {
            endedAt: Date.now(),
            status: "completed",
          },
        },
        {
          onSuccess: () => {
            if (markingSession?.id === sessionId) {
              setMarkingSession(null);
            }
            toast.success("تم إنهاء الحصة وتوثيق الحضور.");
          },
        },
      );
    }
  };

  const arabicDays = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];
  const todayName = arabicDays[new Date().getDay()];
  const todayScheduledGroups =
    groups?.filter(
      (g) =>
        g.status === "in_progress" &&
        (g.daysOfWeek?.includes(todayName) || g.daysOfWeek?.length === 0),
    ) || [];

  const absentRecords = allRecords?.filter((r) => r.status === "absent") || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            الحضور والغياب
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            اليوم: {todayName}،{" "}
            {format(new Date(), "dd MMMM yyyy", { locale: ar })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Zap className="w-3.5 h-3.5 ml-1" />
            <span>البدء التلقائي للحصص: نشط</span>
          </div>

          <button
            onClick={handleManualAutoCheck}
            disabled={isAutoChecking}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            title="فحص الجدول وبدء الحصص التي حان موعدها فوراً"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isAutoChecking ? "animate-spin" : ""}`}
            />
            <span>فحص الجدول الآن</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
          بدء حصة جديدة
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {groups
            ?.filter((g) => g.status === "in_progress")
            .map((group) => {
              const isLive = activeSessions?.some(
                (s) => s.groupId === group.id,
              );
              return (
                <div
                  key={group.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {group.name}
                      </h3>
                      {isLive && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                          نشطة الآن
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      {courseMap.get(group.courseId)}
                    </p>
                    <p
                      className="text-xs text-slate-600 dark:text-slate-400 mb-3 font-mono"
                      dir="rtl"
                    >
                      {formatTimeRange12(group.startTime, group.endTime)}
                    </p>
                  </div>
                  <div>
                    {isLive ? (
                      <button
                        onClick={() => {
                          const session = activeSessions?.find(
                            (s) => s.groupId === group.id,
                          );
                          if (session) setMarkingSession(session);
                        }}
                        className="w-full flex items-center justify-center py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-xs font-semibold border border-blue-200 dark:border-blue-900/50"
                      >
                        <CheckCircle className="w-3.5 h-3.5 ml-1.5" />
                        إدارة الحضور
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleStartSession(group.id, group.courseId, false)
                        }
                        disabled={createSession.isPending}
                        className="w-full flex items-center justify-center py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-md transition-colors text-xs font-semibold shadow-xs disabled:opacity-50"
                      >
                        {createSession.isPending ? (
                          <div className="w-3 h-3 ml-1 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 ml-1" />
                        )}
                        بدء حصة
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          {groups?.filter((g) => g.status === "in_progress").length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-6 text-xs">
              لا توجد مجموعات قيد التنفيذ حالياً
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto px-2">
          {[
            {
              id: "live",
              label: `الحصص النشطة (${activeSessions?.length || 0})`,
            },
            {
              id: "upcoming",
              label: `مجدول اليوم (${todayScheduledGroups.length})`,
            },
            {
              id: "history",
              label: `السجل المنتهي (${completedSessions?.length || 0})`,
            },
            { id: "absent", label: `سجل الغائبين (${absentRecords.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "live" && (
            <div>
              {activeSessions?.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  <Play className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-40" />
                  <p>لا توجد حصص نشطة في الوقت الحالي.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {activeSessions?.map((session) => (
                    <div
                      key={session.id}
                      className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{groupMap.get(session.groupId)?.name}</span>
                            {session.isTrial && (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] border border-slate-200 dark:border-slate-700">
                                حصة تجريبية
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {courseMap.get(session.courseId)}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                          جاري الآن
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mb-4 flex gap-4 font-mono">
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 ml-1 text-slate-400" />{" "}
                          بدأ: {formatTimestamp12(session.startedAt)}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setStartWithCamera(false);
                            setMarkingSession(session);
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-md text-xs font-bold transition-colors shadow-xs cursor-pointer"
                        >
                          تسجيل الحضور والغياب
                        </button>
                        <button
                          onClick={() => {
                            setStartWithCamera(true);
                            setMarkingSession(session);
                          }}
                          className="px-3 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 py-1.5 rounded-md text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                          title="مسح مباشر بكاميرا الهاتف"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">مسح بالكاميرا</span>
                        </button>
                        <button
                          onClick={() => handleEndSession(session.id)}
                          className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-1.5 rounded-md text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        >
                          إنهاء الحصة
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "upcoming" && (
            <div>
              {todayScheduledGroups.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>لا توجد مجموعات مجدولة لهذا اليوم.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todayScheduledGroups.map((group) => (
                    <div
                      key={group.id}
                      className="border border-slate-200 dark:border-slate-800 rounded-lg p-5"
                    >
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">
                        {group.name}
                      </h3>
                      <p className="text-sm text-slate-500 mb-3">
                        {courseMap.get(group.courseId)}
                      </p>
                      <div
                        className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 font-mono"
                        dir="rtl"
                      >
                        <Clock className="w-4 h-4 ml-1.5 text-blue-500" />
                        {formatTimeRange12(group.startTime, group.endTime)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div>
              {completedSessions?.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <StopCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>لم يتم إنهاء أي حصص بعد.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">المجموعة</th>
                        <th className="px-4 py-2.5 font-semibold">النوع</th>
                        <th className="px-4 py-2.5 font-semibold">التاريخ</th>
                        <th className="px-4 py-2.5 font-semibold">وقت البدء</th>
                        <th className="px-4 py-2.5 font-semibold">
                          وقت الانتهاء
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {completedSessions
                        ?.sort((a, b) => b.startedAt - a.startedAt)
                        .map((session) => (
                          <tr
                            key={session.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                              {groupMap.get(session.groupId)?.name}
                            </td>
                            <td className="px-4 py-2.5">
                              {session.isTrial ? (
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                                  تجريبية
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs">
                                  عادية
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 font-mono">
                              {format(
                                new Date(session.startedAt),
                                "dd MMM yyyy",
                                { locale: ar },
                              )}
                            </td>
                            <td
                              className="px-4 py-2.5 text-slate-500 font-mono"
                              dir="rtl"
                            >
                              {formatTimestamp12(session.startedAt)}
                            </td>
                            <td
                              className="px-4 py-2.5 text-slate-500 font-mono"
                              dir="rtl"
                            >
                              {session.endedAt
                                ? formatTimestamp12(session.endedAt)
                                : "-"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "absent" && (
            <div>
              {absentRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                  <p>لا يوجد غياب مسجل!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">الطالب</th>
                        <th className="px-4 py-2.5 font-semibold">المجموعة</th>
                        <th className="px-4 py-2.5 font-semibold">ولي الأمر</th>
                        <th className="px-4 py-2.5 font-semibold">التاريخ</th>
                        <th className="px-4 py-2.5 font-semibold text-center">
                          تواصل
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {absentRecords.map((record) => {
                        const student = students?.find(
                          (s) => s.id === record.studentId,
                        );
                        if (!student) return null;

                        const msg = `مرحباً ولي أمر الطالب ${student.name}، نود إعلامكم بغياب الطالب عن حصة مجموعة ${groupMap.get(record.groupId)?.name || ""} اليوم.`;
                        const targetPhone =
                          student.parentPhone || student.phone;
                        const waLink = getWhatsAppUrl(targetPhone, msg);

                        return (
                          <tr
                            key={record.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                              {student.name}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                              {groupMap.get(record.groupId)?.name}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                              {student.parentName || "-"}{" "}
                              <span
                                className="font-mono text-slate-500"
                                dir="ltr"
                              >
                                ({student.parentPhone})
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 font-mono">
                              {format(
                                new Date(record.markedAt),
                                "dd MMM yyyy",
                                { locale: ar },
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {waLink ? (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold transition-colors shadow-2xs"
                                >
                                  <MessageCircle className="w-3 h-3 ml-1" />
                                  واتساب
                                </a>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600 text-[11px]">
                                  بدون رقم
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {markingSession && (
          <AttendanceModal
            session={markingSession}
            onClose={() => setMarkingSession(null)}
            groupName={groupMap.get(markingSession.groupId)?.name || ""}
            initialCameraOpen={startWithCamera}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AttendanceModal({
  session,
  onClose,
  groupName,
  initialCameraOpen = false,
}: {
  session: AttendanceSession;
  onClose: () => void;
  groupName: string;
  initialCameraOpen?: boolean;
}) {
  const toast = useToast();

  const { data: allCourses = [] } = useApiQuery<Course>("courses", 60 * 1000);
  const currentCourse = allCourses.find((c) => c.id === session.courseId);

  const { data: allEnrollments = [] } = useApiQuery<any>(
    "enrollments",
    30 * 1000,
  );
  const groupEnrollments = allEnrollments.filter(
    (e: any) => e.groupId === session.groupId,
  );
  const activeStudentIds = groupEnrollments
    .filter((e: any) => e.status === "active")
    .map((e: any) => e.studentId);

  const { data: allStudents = [] } = useApiQuery<Student>(
    "students",
    60 * 1000,
  );
  const rosterStudents = allStudents.filter(
    (s) => activeStudentIds.includes(s.id) && !s.deleted_at,
  );

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const { data: allSubscriptions = [] } = useApiQuery<any>(
    "monthlySubscriptions",
    60 * 1000,
  );
  const currentSubscriptions = allSubscriptions.filter(
    (sub: any) =>
      sub.courseId === session.courseId &&
      sub.month === currentMonth &&
      sub.year === currentYear &&
      !sub.deleted_at,
  );

  const { data: allRecords = [] } = useApiQuery<AttendanceRecord>(
    "attendanceRecords",
    30 * 1000,
  );
  const existingRecords = allRecords.filter((r) => r.sessionId === session.id);

  const { data: settingsArray = [] } = useApiQuery<any>("settings", 60 * 1000);
  const settings = settingsArray[0];
  const freeSessionLimit = settings?.freeSessionLimitPerStudent || 1;

  const { data: allSessions = [] } = useApiQuery<AttendanceSession>(
    "attendanceSessions",
    30 * 1000,
  );
  const allTrialSessions = allSessions.filter((s) => s.isTrial);
  const trialSessionIds = allTrialSessions.map((s) => s.id);
  const allTrialRecords = allRecords; // Since allRecords already fetched

  const groupCompletedSessions = allSessions.filter(
    (s) => s.status === "completed",
  );
  const prevSession = groupCompletedSessions
    .filter((s) => s.groupId === session.groupId)
    .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0))[0];
  const prevSessionRecords = prevSession
    ? allRecords.filter((r) => r.sessionId === prevSession.id)
    : [];

  const { create: createRecord, update: updateRecord } =
    useApiMutation<AttendanceRecord>("attendanceRecords");
  const { data: qrCards = [] } = useApiQuery<any>("qrCards", 60 * 1000);

  const [recordMap, setRecordMap] = useState<
    Record<string, "present" | "absent" | "compensation">
  >({});
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewTab, setViewTab] = useState<"attended" | "absent">("attended");
  const [extraGuestStudents, setExtraGuestStudents] = useState<Student[]>([]);

  const [qrInput, setQrInput] = useState("");
  const [lastScannedData, setLastScannedData] = useState<ScannedStudentData | null>(null);
  const [showLiveScanner, setShowLiveScanner] = useState(initialCameraOpen);

  // Auto-launch live camera scanner if modal was opened with camera mode
  useEffect(() => {
    if (initialCameraOpen) {
      setShowLiveScanner(true);
    }
  }, [initialCameraOpen]);

  // Direct native device camera capture states and ref
  const directCameraInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingDirectCamera, setIsProcessingDirectCamera] = useState(false);

  const qrInputRef = useRef<HTMLInputElement>(null);
  const initializedSessionIdRef = useRef<string | null>(null);
  const processStudentCodeRef = useRef<(code: string) => void>(() => {});

  // Combine roster students and any guest students attended in this session
  const combinedStudents = [
    ...rosterStudents,
    ...extraGuestStudents.filter(
      (g) => !rosterStudents.some((r) => r.id === g.id),
    ),
  ];

  // Initialize recordMap once per session from existing database records
  useEffect(() => {
    if (session?.id && initializedSessionIdRef.current !== session.id) {
      const sessionRecords = allRecords.filter(
        (r) => r.sessionId === session.id,
      );

      setRecordMap((prev) => {
        const map: Record<string, "present" | "absent" | "compensation"> = { ...prev };
        sessionRecords.forEach((r) => {
          if (r.studentId && !map[r.studentId]) {
            map[r.studentId] = r.status;
          }
        });
        return map;
      });

      const guestIds = sessionRecords
        .map((r) => r.studentId)
        .filter(
          (id): id is string =>
            !!id && !rosterStudents.some((s) => s.id === id),
        );
      if (guestIds.length > 0 && allStudents.length > 0) {
        const guests = allStudents.filter((s) => guestIds.includes(s.id));
        setExtraGuestStudents((prev) => [
          ...prev,
          ...guests.filter((g) => !prev.some((p) => p.id === g.id)),
        ]);
      }

      if (allRecords.length > 0 || sessionRecords.length > 0) {
        initializedSessionIdRef.current = session.id;
      }
    }
  }, [session?.id, allRecords, rosterStudents, allStudents]);

  // Process code scanning or manual submit
  const processStudentCode = (rawCode: string) => {
    const rawTrimmed = rawCode.trim();
    setQrInput("");
    if (!rawTrimmed) return;

    // Support dual-purpose QR codes encoding full URL (e.g. https://.../s/1001) as well as raw codes
    const extracted = extractStudentCodeFromScanned(rawTrimmed);
    const code = extracted || rawTrimmed;

    // Convert Arabic numerals to standard digits and strip leading '#' or symbols
    const normalizedCode = code
      .replace(/^[#№\s]+/, "")
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
      .trim();

    const cleanDigits = normalizedCode.replace(/\D/g, "");
    const numValue = cleanDigits ? parseInt(cleanDigits, 10) : null;

    const matchesStudent = (s: Student) => {
      if (!s) return false;
      // 1. Database ID match
      if (
        s.id === code ||
        s.id === normalizedCode ||
        s.id?.toLowerCase() === code.toLowerCase() ||
        s.id?.toLowerCase() === normalizedCode.toLowerCase()
      ) {
        return true;
      }

      // 2. Student code exact match
      if (s.studentCode) {
        const normStudentCode = s.studentCode
          .replace(/^[#№\s]+/, "")
          .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
          .trim();
        if (
          s.studentCode === code ||
          s.studentCode === normalizedCode ||
          normStudentCode === normalizedCode
        ) {
          return true;
        }
        // Numeric value match (e.g. '0009' matches '9')
        if (numValue !== null) {
          const sDigits = normStudentCode.replace(/\D/g, "");
          if (sDigits && parseInt(sDigits, 10) === numValue) return true;
        }
      }

      // 3. Phone match
      const sPhoneDigits = (s.phone || "")
        .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
        .replace(/\D/g, "");
      const sParentPhoneDigits = (s.parentPhone || "")
        .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
        .replace(/\D/g, "");
      if (cleanDigits && cleanDigits.length >= 7) {
        if (
          sPhoneDigits.endsWith(cleanDigits) ||
          sParentPhoneDigits.endsWith(cleanDigits)
        ) {
          return true;
        }
      }

      // 4. Exact name match
      if (
        s.name &&
        (s.name.trim().toLowerCase() === code.toLowerCase() ||
          s.name.trim().toLowerCase() === normalizedCode.toLowerCase())
      ) {
        return true;
      }

      return false;
    };

    const matchesCard = (c: any) => {
      if (!c) return false;
      const cNum = (c.cardNumber || "").toString().trim();
      const cData = (c.qrCodeData || "").toString().trim();
      if (
        cNum === code ||
        cNum === normalizedCode ||
        cData === code ||
        cData === normalizedCode
      )
        return true;
      if (numValue !== null) {
        const cClean = cNum
          .replace(/[٠-٩]/g, (d: string) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
          .replace(/\D/g, "");
        if (cClean && parseInt(cClean, 10) === numValue) return true;
      }
      return false;
    };

    // 1. Try finding in roster first
    let foundStudent: any = rosterStudents.find(matchesStudent);

    // 2. If not found by student code, check qr cards in roster
    if (!foundStudent) {
      const card = qrCards?.find(matchesCard);
      if (card && card.status === "active" && card.studentId) {
        foundStudent = rosterStudents.find((s) => s.id === card.studentId);
      } else if (card && card.status !== "active") {
        toast.error("هذه البطاقة موقوفة وغير صالحة");
        return;
      }
    }

    // 3. If still not found in roster, check all students across the academy
    if (!foundStudent && allStudents) {
      const globalStudent = allStudents.find(matchesStudent);

      if (globalStudent) {
        foundStudent = globalStudent;
        setExtraGuestStudents((prev) => [
          ...prev.filter((x) => x.id !== globalStudent.id),
          globalStudent,
        ]);
      } else {
        const card = qrCards?.find(matchesCard);
        if (card && card.status === "active" && card.studentId) {
          const cardStudent = allStudents.find((s) => s.id === card.studentId);
          if (cardStudent) {
            foundStudent = cardStudent;
            setExtraGuestStudents((prev) => [
              ...prev.filter((x) => x.id !== cardStudent.id),
              cardStudent,
            ]);
          }
        }
      }
    }

    if (!foundStudent) {
      toast.error(`لم يتم العثور على طالب بكود أو معرف (${code}) في النظام`);
      qrInputRef.current?.focus();
      return;
    }

    if (session.isTrial) {
      const pastTrialsCount =
        allTrialRecords?.filter(
          (r) =>
            r.studentId === foundStudent.id &&
            r.status === "present" &&
            trialSessionIds.includes(r.sessionId) &&
            r.sessionId !== session.id,
        ).length || 0;

      if (pastTrialsCount >= freeSessionLimit) {
        toast.error("استنفد الطالب الحد الأقصى لحصص التجربة");
        return;
      }
    }

    const isGuest = !rosterStudents.some((s) => s.id === foundStudent.id);
    const targetStatus = isGuest ? "compensation" : "present";

    // Update local state
    setRecordMap((prev) => ({ ...prev, [foundStudent.id]: targetStatus }));

    // Switch to attended view so user immediately sees the success feedback
    setViewTab("attended");

    // Persist immediately to database
    const existingRec = allRecords.find(
      (r) => r.sessionId === session.id && r.studentId === foundStudent.id,
    );
    if (existingRec) {
      if (existingRec.status !== targetStatus) {
        updateRecord.mutate({
          id: existingRec.id,
          data: { status: targetStatus, markedAt: Date.now() },
        });
      }
    } else {
      createRecord.mutate({
        sessionId: session.id,
        studentId: foundStudent.id,
        groupId: session.groupId,
        status: targetStatus,
        markedAt: Date.now(),
      });
    }

    const sub = currentSubscriptions?.find(
      (s) => s.studentId === foundStudent.id,
    );

    // Compute attendance count for this student in this group
    const attendedCount = allRecords.filter(
      (r) =>
        r.studentId === foundStudent.id &&
        (r.groupId === session.groupId || !r.groupId) &&
        (r.status === "present" || r.status === "compensation"),
    ).length + ((existingRec?.status === "present" || existingRec?.status === "compensation") ? 0 : 1);

    // Update last scanned student data to immediately trigger the BottomSheet / Desktop card
    setLastScannedData({
      student: foundStudent,
      markedAt: Date.now(),
      session,
      courseName: currentCourse?.name,
      groupName,
      subscription: sub,
      coursePrice: currentCourse?.price,
      attendanceCountInGroup: attendedCount,
      isGuest: !rosterStudents.some((s) => s.id === foundStudent.id),
      isCompensation: targetStatus === "compensation",
    } as any);

    if (!session.isTrial && (!sub || sub.status !== "paid")) {
      toast.success(
        `تم التحضير: ${foundStudent.name} (تنبيه: لم يسدد اشتراك الشهر)`,
      );
    } else {
      toast.success(
        `تم تحضير الطالب: ${foundStudent.name} (#${foundStudent.studentCode || code})`,
      );
    }

    // Keep focus ready for next scan
    setTimeout(() => {
      qrInputRef.current?.focus();
    }, 50);
  };

  // Keep ref up to date to prevent stale closures
  processStudentCodeRef.current = processStudentCode;

  // Process File Captured from the Native Device Camera App (Direct Launch)
  const handleDirectCameraFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingDirectCamera(true);
    setQrInput(""); // clear manually entered text

    // Create a temporary off-screen container for Html5Qrcode file decoding
    const tempDivId = `direct-temp-scanner-${Math.random().toString(36).substring(2, 9)}`;
    const tempContainer = document.createElement("div");
    tempContainer.id = tempDivId;
    tempContainer.style.display = "none";
    document.body.appendChild(tempContainer);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const tempScanner = new Html5Qrcode(tempDivId);
      const decodedText = await tempScanner.scanFile(file, false);
      
      // Successfully decoded! Pass the decoded student ID/code to the processor
      processStudentCode(decodedText);
      
      try {
        tempScanner.clear();
      } catch (e) {}
    } catch (err: any) {
      console.warn("Direct device camera decode failed:", err);
      toast.error("لم يتم العثور على باركود أو كود QR واضح في الصورة. يرجى تصوير الكارت عن قرب وتحت إضاءة جيدة.");
    } finally {
      try {
        document.body.removeChild(tempContainer);
      } catch (e) {}
      if (directCameraInputRef.current) {
        directCameraInputRef.current.value = "";
      }
      setIsProcessingDirectCamera(false);
    }
  };

  useEffect(() => {
    // Focus barcode input on mount and when modal opens
    setTimeout(() => {
      if (qrInputRef.current) {
        qrInputRef.current.focus();
      }
    }, 100);

    // Global keyboard listener to capture barcode even if input loses focus
    let buffer = "";
    let lastKeyTime = 0;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const currentTime = performance.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = "";
      }
      lastKeyTime = currentTime;

      if (/^[0-9a-zA-Z\-]$/.test(e.key)) {
        buffer += e.key;
      } else if (e.key === "Enter" && buffer.length > 0) {
        e.preventDefault();
        const code = buffer.trim();
        buffer = "";
        if (!code) return;
        processStudentCodeRef.current(code);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleQrScan = (e: any) => {
    if (e.key === "Enter") {
      e.preventDefault();
      processStudentCode(qrInput);
    }
  };

  const toggleStudentStatus = (
    studentId: string,
    status: "present" | "absent" | "compensation",
  ) => {
    setRecordMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));

    // Persist immediately
    const existingRec = allRecords.find(
      (r) => r.sessionId === session.id && r.studentId === studentId,
    );
    if (existingRec) {
      if (existingRec.status !== status) {
        updateRecord.mutate({
          id: existingRec.id,
          data: { status, markedAt: Date.now() },
        });
      }
    } else {
      createRecord.mutate({
        sessionId: session.id,
        studentId,
        groupId: session.groupId,
        status,
        markedAt: Date.now(),
      });
    }
  };

  const markAll = (status: "present" | "absent") => {
    if (combinedStudents.length === 0) {
      toast.info("لا يوجد طلاب في هذه المجموعة لتسجيل حالتهم");
      return;
    }

    const nextMap: Record<string, "present" | "absent"> = {};
    combinedStudents.forEach((s) => {
      nextMap[s.id] = status;
    });
    setRecordMap(nextMap);

    // Persist immediately to database
    combinedStudents.forEach((student) => {
      const existing = allRecords.find(
        (r) => r.sessionId === session.id && r.studentId === student.id,
      );
      if (existing) {
        if (existing.status !== status) {
          updateRecord.mutate({
            id: existing.id,
            data: { status, markedAt: Date.now() },
          });
        }
      } else {
        createRecord.mutate({
          sessionId: session.id,
          studentId: student.id,
          groupId: session.groupId,
          status,
          markedAt: Date.now(),
        });
      }
    });

    if (status === "present") {
      setViewTab("attended");
      toast.success(`تم تحضير جميع الطلاب (${combinedStudents.length}) بنجاح`);
    } else {
      setViewTab("absent");
      toast.info(`تم رصد جميع الطلاب (${combinedStudents.length}) كغائبين`);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // If it's a trial session, prevent saving if limit exceeded for any present student
      if (session.isTrial) {
        const overLimitStudents = combinedStudents.filter((student) => {
          if (recordMap[student.id] === "present" || recordMap[student.id] === "compensation") {
            const pastTrials =
              allTrialRecords?.filter(
                (r) =>
                  r.studentId === student.id &&
                  (r.status === "present" || r.status === "compensation") &&
                  trialSessionIds.includes(r.sessionId) &&
                  r.sessionId !== session.id,
              ).length || 0;

            if (pastTrials >= freeSessionLimit) return true;
          }
          return false;
        });

        if (overLimitStudents.length > 0) {
          toast.error(
            `يوجد ${overLimitStudents.length} طلاب استنفدوا حد حصص التجربة المسموح (${freeSessionLimit}). يرجى تغييبهم أو تعديل الإعدادات.`,
          );
          setIsSaving(false);
          return;
        }
      }

      await Promise.all(
        combinedStudents.map(async (student) => {
          const status = recordMap[student.id] || "absent";
          const existing = allRecords.find(
            (r) => r.sessionId === session.id && r.studentId === student.id,
          );

          if (existing) {
            if (existing.status !== status) {
              await updateRecord.mutateAsync({
                id: existing.id,
                data: {
                  status,
                  markedAt: Date.now(),
                },
              });
            }
          } else {
            await createRecord.mutateAsync({
              sessionId: session.id,
              studentId: student.id,
              groupId: session.groupId,
              status,
              markedAt: Date.now(),
            });
          }
        }),
      );

      setIsSaved(true);
      toast.success("تم حفظ كشف الحضور بنجاح");
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      toast.error(
        "حدث خطأ أثناء حفظ كشف الحضور: " + (err?.message || "فشل الحفظ"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Split students into attended (present or compensation) and absent
  const attendedStudents = combinedStudents.filter(
    (s) => recordMap[s.id] === "present" || recordMap[s.id] === "compensation",
  );
  const absentStudents = combinedStudents.filter(
    (s) => recordMap[s.id] !== "present" && recordMap[s.id] !== "compensation",
  );

  const presentCount = attendedStudents.length;
  const absentCount = absentStudents.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto"
      dir="rtl"
    >
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
      />

      {/* Sheet Content Drawer */}
      <motion.div
        initial={{ y: "100%", opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative w-full max-w-4xl lg:max-w-5xl bg-white dark:bg-slate-900 rounded-t-[24px] sm:rounded-xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-750 overflow-hidden flex flex-col h-auto max-h-[85vh] sm:max-h-[90vh] z-10"
      >
        {/* Grab Handle for mobile */}
        <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden shrink-0 bg-white dark:bg-slate-900">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>تسجيل كشف الحضور: {groupName}</span>
              {session.isTrial && (
                <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-full text-[11px] border border-amber-200 dark:border-amber-800 font-bold">
                  حصة تجريبية
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span>
                إجمالي مقيدي المجموعة:{" "}
                <strong className="text-slate-700 dark:text-slate-300 font-mono">
                  {rosterStudents.length}
                </strong>
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                الحاضرين: <strong className="font-mono">{presentCount}</strong>
              </span>
              <span>•</span>
              <span className="text-slate-400">
                المتبقين / الغائبين:{" "}
                <strong className="font-mono">{absentCount}</strong>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean, Prominent Scanner Input Bar */}
        <div className="p-3 sm:p-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          {/* Mobile Layout: A super compact row to prevent vertical stacking and preserve keyboard space */}
          <div className="flex sm:hidden items-center gap-2">
            <div className="relative flex-1">
              <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={qrInputRef}
                type="text"
                placeholder="أدخل كود الطالب (مثال: 0009)..."
                className="w-full pl-10 pr-9 py-2.5 border-2 border-blue-300 dark:border-blue-700/80 rounded-xl text-base text-slate-900 dark:text-slate-100 bg-blue-50/20 dark:bg-slate-800/40 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 focus:outline-none text-left font-mono font-bold tracking-wider transition-all placeholder:text-slate-400 placeholder:text-xs placeholder:font-sans placeholder:tracking-normal shadow-2xs"
                dir="ltr"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={handleQrScan}
              />
              {qrInput && (
                <button
                  type="button"
                  onClick={() => processStudentCode(qrInput)}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors cursor-pointer"
                  title="تسجيل الحضور"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Camera Stream Toggle Button - Compact Icon style */}
            <button
              type="button"
              onClick={() => setShowLiveScanner(!showLiveScanner)}
              className={`p-3 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                showLiveScanner
                  ? "bg-amber-600 border-amber-500 text-white"
                  : "bg-blue-600 border-blue-500 text-white"
              }`}
              title="تشغيل الكاميرا المباشرة"
            >
              <Camera className={`w-5 h-5 ${showLiveScanner ? "animate-pulse" : ""}`} />
            </button>

            {/* Direct Device Native Camera Action Button - Compact Icon style */}
            <button
              type="button"
              onClick={() => directCameraInputRef.current?.click()}
              disabled={isProcessingDirectCamera}
              className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
              title="تصوير الكارت بالكاميرا الحقيقية"
            >
              {isProcessingDirectCamera ? (
                <div className="w-5 h-5 border-2 border-slate-700 dark:border-slate-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Image className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Desktop Layout: Side-by-side rich controls */}
          <div className="hidden sm:flex flex-row items-center gap-3">
            <div className="relative flex-1">
              <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="أدخل كود الطالب أو امسح الباركود (مثال: 0009)..."
                className="w-full pl-4 pr-11 py-3 border-2 border-blue-300 dark:border-blue-700/80 rounded-xl text-base text-slate-900 dark:text-slate-100 bg-blue-50/20 dark:bg-slate-800/40 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 focus:outline-none text-left font-mono font-bold tracking-wider transition-all placeholder:text-slate-400 placeholder:text-xs placeholder:font-sans placeholder:tracking-normal shadow-2xs"
                dir="ltr"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={handleQrScan}
              />
            </div>

            {/* Hidden Input for Direct Native Camera Launch */}
            <input
              type="file"
              ref={directCameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleDirectCameraFile}
              className="hidden"
            />

            {/* Live Camera Stream Toggle Button */}
            <button
              type="button"
              onClick={() => setShowLiveScanner(!showLiveScanner)}
              className={`px-4 py-3 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer shrink-0 border ${
                showLiveScanner
                  ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-500"
                  : "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
              }`}
              title="تشغيل البث الحي للكاميرا لمسح فوري للكود"
            >
              <Camera className={`w-4 h-4 ${showLiveScanner ? "animate-pulse" : ""}`} />
              <span>{showLiveScanner ? "إغلاق الكاميرا المباشرة" : "تشغيل الكاميرا المباشرة"}</span>
            </button>

            {/* Direct Device Native Camera Action Button */}
            <button
              type="button"
              onClick={() => directCameraInputRef.current?.click()}
              disabled={isProcessingDirectCamera}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
              title="فتح كاميرا الهاتف الحقيقية لالتقاط صورة للكارت"
            >
              {isProcessingDirectCamera ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-700 dark:border-slate-300 border-t-transparent rounded-full animate-spin" />
                  <span>جاري القراءة...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>تصوير الكارت (بديل)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => processStudentCode(qrInput)}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>تسجيل الحضور (Enter)</span>
            </button>
          </div>

          {/* Sub-bar: View Selector & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setViewTab("attended")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                  viewTab === "attended"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>الطلاب الحاضرين ({presentCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewTab("absent")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                  viewTab === "absent"
                    ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>الطلاب المتبقين / الغائبين ({absentCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => markAll("present")}
                className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                تحضير الكل
              </button>
              <button
                onClick={() => markAll("absent")}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                تغييب الكل
              </button>
            </div>
          </div>
        </div>


        {/* Content Body: DOES NOT list all students by default, shows live attended feed */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/40 dark:bg-slate-950/20 space-y-4">
          {showLiveScanner && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
              <div className="w-full h-full md:max-w-xl md:h-[82vh] md:max-h-[720px] bg-black border border-white/10 rounded-none md:rounded-2xl shadow-2xl overflow-hidden relative flex flex-col animate-in zoom-in-95 duration-150">
                <CameraScanner
                  onScan={processStudentCode}
                  onClose={() => setShowLiveScanner(false)}
                />
              </div>
            </div>
          )}

          {viewTab === "attended" ? (
            attendedStudents.length === 0 ? (
              <div 
                onClick={() => setShowLiveScanner(true)}
                className="flex flex-col items-center justify-center py-12 px-6 text-center max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 cursor-pointer transition-all active:scale-[0.98] shadow-2xs group"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <QrCode className="w-8 h-8 opacity-70" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  في انتظار مسح أكواد الطلاب
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  مرر كارت أو باركود الطالب أمام القارئ أو اكتب كود الطالب (مثال: <strong>0009</strong>) ثم اضغط Enter ليتم إدراجه فوراً في كشف الحاضرين.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-2.5 w-full justify-center">
                  <span className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer">
                    <Camera className="w-4 h-4 animate-pulse" />
                    اضغط للبدء بالمسح بالكاميرا المباشرة
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening scanner
                      qrInputRef.current?.focus();
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    الكتابة اليدوية للكود
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1 mb-1">
                  <span>
                    تم تحضير <strong>{attendedStudents.length}</strong> طالب في
                    هذه الحصة:
                  </span>
                  <span className="text-[11px]">مرتب حسب التسجيل</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attendedStudents.map((student) => {
                    const studentSub = currentSubscriptions?.find(
                      (s) => s.studentId === student.id,
                    );
                    const isPaid = studentSub && studentSub.status === "paid";

                    return (
                      <div
                        key={student.id}
                        className={`p-3.5 bg-white dark:bg-slate-900 rounded-xl border shadow-2xs flex items-center justify-between gap-3 transition-colors ${
                          recordMap[student.id] === "compensation"
                            ? "border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400 bg-amber-50/5 dark:bg-amber-950/5"
                            : "border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-400 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border ${
                            recordMap[student.id] === "compensation"
                              ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40"
                              : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40"
                          }`}>
                            ✓
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                {student.name}
                              </p>
                              {student.studentCode && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  #{student.studentCode}
                                </span>
                              )}
                              {recordMap[student.id] === "compensation" && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  تعويض
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px]">
                              <span className="text-slate-400 font-mono">
                                {student.phone || "-"}
                              </span>
                              <span className="text-slate-300">•</span>
                              {isPaid ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  سدد الاشتراك
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  لم يسدد الشهر
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {recordMap[student.id] === "present" ? (
                            <button
                              type="button"
                              onClick={() => toggleStudentStatus(student.id, "compensation")}
                              className="px-2 py-1 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg text-[10px] font-bold transition-colors"
                              title="تغيير الحالة إلى حضور تعويض"
                            >
                              تعويض
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleStudentStatus(student.id, "present")}
                              className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-bold transition-colors"
                              title="تغيير الحالة إلى حضور عادي"
                            >
                              حضور عادي
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              toggleStudentStatus(student.id, "absent")
                            }
                            className="px-2 py-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-[10px] font-bold transition-colors"
                            title="إلغاء التحضير ورصده كغائب"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  قائمة الطلاب غير المسجلين كحضور بعد ({absentStudents.length}):
                </span>
                <span className="text-[11px]">
                  يمكنك الضغط على "تحضير" لتسجيل الطالب يدوياً
                </span>
              </div>

              {absentStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    اكتمل الحضور! تم تحضير جميع الطلاب المقيدين.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {absentStudents.map((student) => (
                    <div
                      key={student.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                            {student.name}
                          </p>
                          {student.studentCode && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              #{student.studentCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {student.phone || "-"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleStudentStatus(student.id, "present")
                        }
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                      >
                        + تحضير
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="text-xs">
            {isSaved ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ تم حفظ كشف الحضور بنجاح!
              </span>
            ) : (
              <span className="text-slate-500">
                إجمالي المسجلين كحضور:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                  {presentCount}
                </strong>
              </span>
            )}
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-bold transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>حفظ كشف الحضور</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* 1. Mobile Bottom Sheet: Slides up from bottom upon scan with general info & payment status */}
      <div className="block sm:hidden">
        <ScannedStudentBottomSheet
          data={lastScannedData}
          onClose={() => setLastScannedData(null)}
        />
      </div>

      {/* 2. Desktop Floating Card: Displayed when a student is scanned */}
      {lastScannedData && (
        <div className="hidden sm:block">
          <ScannedStudentDesktopCard
            data={lastScannedData}
            onClose={() => setLastScannedData(null)}
            mode="floating"
          />
        </div>
      )}
    </div>
  );
}
