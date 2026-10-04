import { useEffect, useState, type ReactNode } from "react";
import { Button, Card } from "@heroui/react";
import {
  AlignLeft,
  BellRing,
  CircleDashed,
  Download,
  Eraser,
  ExternalLink,
  FileSpreadsheet,
  MessageSquare,
  RefreshCw,
  Settings,
  SquareStack,
} from "lucide-react";
import { clearSessions, countSessions } from "@/db/client";
import { Dialog } from "@/components/ui/Dialog";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { applyFocusAssist, openSystemSettings } from "@/lib/desktop";
import { exportBackup, exportSessionsCsv } from "@/lib/exporter";
import { GOAL_MAX, GOAL_MIN, GOAL_STEP } from "@/lib/presetEditor";
import {
  isTouchPrimary,
  supportsAutoUpdate,
  supportsFocusAssist,
  supportsKeepAwake,
  supportsWindowControls,
} from "@/lib/platform";
import { DOWNLOAD_URL, ISSUES_URL, openExternal } from "@/lib/links";
import { useAppTheme, type ThemePreference } from "@/lib/theme";
import type { ClockFace } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/stores/dataStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUpdateStore } from "@/stores/updateStore";

const THEME_OPTIONS = [
  { value: "system" as ThemePreference, label: "跟随系统" },
  { value: "light" as ThemePreference, label: "亮色" },
  { value: "dark" as ThemePreference, label: "暗色" },
];

const FACE_OPTIONS = [
  { value: "ring" as ClockFace, label: "圆环", icon: CircleDashed },
  { value: "flip" as ClockFace, label: "翻页", icon: SquareStack },
  { value: "plain" as ClockFace, label: "常态", icon: AlignLeft },
];

function SettingRow({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    // 手机上一行放不下「标题 + 说明 + 控件」，改成上下排，控件在下面单独一行
    <div className="flex flex-col gap-2.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </div>
      <div className="sm:shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <Card.Root>
      <Card.Header className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted">{hint}</span>
      </Card.Header>
      <Card.Content className="divide-y divide-foreground/10">{children}</Card.Content>
    </Card.Root>
  );
}

export default function SettingsPage() {
  const settings = useSettingsStore();
  const { preference, setTheme } = useAppTheme();
  const dataVersion = useDataStore((state) => state.version);
  const appVersion = useUpdateStore((state) => state.currentVersion) || "0.1.0";
  const checkUpdate = useUpdateStore((state) => state.check);
  const checking = useUpdateStore((state) => state.checking);
  const updateNotice = useUpdateStore((state) => state.notice);
  const [totalRecords, setTotalRecords] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"backup" | "csv" | null>(null);
  const [dndNote, setDndNote] = useState<string | null>(null);

  useEffect(() => {
    countSessions()
      .then(setTotalRecords)
      .catch(() => setTotalRecords(0));
  }, [dataVersion]);

  const clearAll = async () => {
    await clearSessions();
    useDataStore.getState().bump();
    setConfirmOpen(false);
  };

  const runExport = async (kind: "backup" | "csv") => {
    setExporting(kind);
    try {
      const path = kind === "backup" ? await exportBackup() : await exportSessionsCsv();
      setExportNote(`已导出到 ${path}`);
    } catch (error) {
      setExportNote(error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(null);
    }
  };

  const toggleDnd = async (next: boolean) => {
    settings.update({ dndEnabled: next });
    if (!next) {
      setDndNote("已关闭系统免打扰");
      return;
    }
    try {
      await applyFocusAssist(true);
      setDndNote("已请求开启，下一次开始计时时生效");
    } catch (error) {
      setDndNote(`系统未接受免打扰请求：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const openNotificationSettings = async () => {
    try {
      await openSystemSettings("notifications");
    } catch (error) {
      setDndNote(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">设置</h1>
        <p className="text-sm text-muted">偏好只保存在这台设备上，换设备不会同步</p>
      </header>

      <SectionCard title="外观" hint="亮暗场景与时钟形态随时可切换">
        <SettingRow title="主题模式" hint="投影或明亮环境下建议用亮色">
          <SegmentedControl<ThemePreference>
            value={preference}
            onChange={setTheme}
            options={THEME_OPTIONS}
          />
        </SettingRow>
        <SettingRow title="时钟形态" hint="圆环、翻页、常态倒计时三种样式">
          <SegmentedControl<ClockFace>
            value={settings.clockFace}
            onChange={(face) => settings.update({ clockFace: face })}
            options={FACE_OPTIONS}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard title="计时偏好" hint="影响每次专注记录的判定方式">
        <SettingRow title="每日专注目标" hint="以 5 分钟为步长，决定侧边栏的灯位与进度">
          <NumberStepper
            ariaLabel="每日专注目标分钟数"
            value={settings.dailyGoalMinutes}
            min={GOAL_MIN}
            max={GOAL_MAX}
            step={GOAL_STEP}
            className="w-full sm:w-36"
            onChange={(dailyGoalMinutes) => settings.update({ dailyGoalMinutes })}
          />
        </SettingRow>
        <SettingRow title="阶段结束提示音" hint="专注或休息结束时响两声">
          <ToggleSwitch
            label="阶段结束提示音"
            isSelected={settings.soundEnabled}
            onChange={(soundEnabled) => settings.update({ soundEnabled })}
          />
        </SettingRow>
        <SettingRow
          title="自动接续下一段"
          hint="专注与休息首尾相接，不用每轮重新点开始；关闭后每段结束会停在那里"
        >
          <ToggleSwitch
            label="阶段结束后自动开始下一段"
            isSelected={settings.autoContinue}
            onChange={(autoContinue) => settings.update({ autoContinue })}
          />
        </SettingRow>
        {supportsKeepAwake() ? (
          <SettingRow title="计时期间阻止屏幕休眠" hint="长时间专注时屏幕不会自动熄灭">
            <ToggleSwitch
              label="计时期间阻止屏幕休眠"
              isSelected={settings.keepAwake}
              onChange={(keepAwake) => settings.update({ keepAwake })}
            />
          </SettingRow>
        ) : null}
        {supportsWindowControls() ? (
          <SettingRow title="窗口置顶" hint="让倒计时始终浮在其他窗口之上">
            <ToggleSwitch
              label="窗口置顶"
              isSelected={settings.alwaysOnTop}
              onChange={(alwaysOnTop) => settings.update({ alwaysOnTop })}
            />
          </SettingRow>
        ) : null}
      </SectionCard>

      {supportsFocusAssist() ? (
        <SectionCard title="专注免打扰" hint="专注期间把消息压下去，别被通知拉走注意力">
          <SettingRow
            title="计时期间开启系统免打扰"
            hint="调用 Windows 11 专注助手，静音其他应用的通知"
          >
            <ToggleSwitch
              label="计时期间开启系统免打扰"
              isSelected={settings.dndEnabled}
              onChange={toggleDnd}
            />
          </SettingRow>

          <div className="flex flex-col gap-3 py-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">提醒白名单</span>
              <span className="text-xs text-muted">选择仍然要发出的本应用提醒</span>
            </div>
            <div className="flex flex-col gap-2.5 rounded-field bg-default p-3.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-foreground">阶段结束提醒（专注 / 休息切换）</span>
                <ToggleSwitch
                  label="阶段结束提醒"
                  isSelected={settings.notifyEnabled}
                  onChange={(notifyEnabled) => settings.update({ notifyEnabled })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-foreground">任务达成预估段数提醒</span>
                <ToggleSwitch
                  label="任务达成预估段数提醒"
                  isSelected={settings.notifyTaskDone}
                  onChange={(notifyTaskDone) => settings.update({ notifyTaskDone })}
                />
              </div>
            </div>
          </div>

          <SettingRow
            title="系统通知设置"
            hint="想让提醒穿透免打扰，需要在系统里把青灯加入优先应用"
          >
            <Button variant="secondary" onPress={openNotificationSettings}>
              <Settings className="size-4" />
              打开系统设置
            </Button>
          </SettingRow>
          {dndNote ? <p className="py-3 text-xs text-muted">{dndNote}</p> : null}
        </SectionCard>
      ) : null}

      <SectionCard title="沉浸模式" hint="进入沉浸模式后只保留时间与当前进度">
        {supportsWindowControls() ? (
          <SettingRow title="进入时自动全屏" hint="关闭后仅在应用窗口内放大显示">
            <ToggleSwitch
              label="沉浸模式自动全屏"
              isSelected={settings.immersiveAutoFullscreen}
              onChange={(immersiveAutoFullscreen) => settings.update({ immersiveAutoFullscreen })}
            />
          </SettingRow>
        ) : null}
        <SettingRow
          title="当前时间常驻显示"
          hint="开启后顶部时间不受自动隐藏影响，随时能看到现在几点"
        >
          <ToggleSwitch
            label="沉浸模式当前时间常驻显示"
            isSelected={settings.immersiveAlwaysShowClock}
            onChange={(immersiveAlwaysShowClock) => settings.update({ immersiveAlwaysShowClock })}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard
        title="数据管理"
        hint={`记录、任务和模板都只存在这台设备上，目前共 ${totalRecords} 条计时记录`}
      >
        <SettingRow title="导出完整备份" hint="把记录、任务、模板和偏好设置存成一个文件，方便留档或换设备">
          <Button
            variant="secondary"
            isDisabled={exporting !== null}
            onPress={() => runExport("backup")}
          >
            <Download className="size-4" />
            {exporting === "backup" ? "导出中" : "导出 JSON"}
          </Button>
        </SettingRow>
        <SettingRow title="导出记录表" hint="导出成表格，可以直接用 Excel 打开查看或统计">
          <Button
            variant="secondary"
            isDisabled={exporting !== null}
            onPress={() => runExport("csv")}
          >
            <FileSpreadsheet className="size-4" />
            {exporting === "csv" ? "导出中" : "导出 CSV"}
          </Button>
        </SettingRow>
        <SettingRow title="清空计时记录" hint="任务与自定义模板会保留，清空后无法恢复">
          <Button variant="danger-soft" onPress={() => setConfirmOpen(true)}>
            <Eraser className="size-4" />
            清空记录
          </Button>
        </SettingRow>
        {exportNote ? (
          <p className="break-all py-3 text-xs text-muted">{exportNote}</p>
        ) : null}
      </SectionCard>

      <Card.Root>
        <Card.Header className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">关于与更新</span>
          <span className="text-xs text-muted">青灯 {appVersion}</span>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 text-xs text-muted">
          {supportsAutoUpdate() ? (
            <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <span className="min-w-0">
                有新版本时会提示你，弹窗里会写清楚这次改了什么
              </span>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                isDisabled={checking}
                onPress={() => void checkUpdate()}
              >
                <RefreshCw className={cn("size-4", checking && "animate-spin")} />
                {checking ? "检查中" : "检查更新"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <span className="min-w-0">有新版本时到下载页取新的安装包，覆盖安装即可升级</span>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onPress={() => void openExternal(DOWNLOAD_URL)}
              >
                <ExternalLink className="size-4" />
                打开下载页
              </Button>
            </div>
          )}
          {updateNotice ? <p className="break-all">{updateNotice}</p> : null}

          <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="min-w-0">用得不顺手或有想法，欢迎到项目主页提一句</span>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onPress={() => void openExternal(ISSUES_URL)}
            >
              <MessageSquare className="size-4" />
              反馈问题
            </Button>
          </div>

          <p>所有记录只保存在这台设备上，不会上传到任何服务器，也不需要注册账号。</p>
          <p>
            操作提示：
            {isTouchPrimary()
              ? "轻点屏幕唤出控制栏；「结束本段」会把已用时间计入统计"
              : "空格开始 / 暂停，Esc 退出沉浸模式；计时中顶端一直显示当前时间"}
          </p>
        </Card.Content>
      </Card.Root>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="清空计时记录"
        description="所有专注与休息记录都会被删除，且无法恢复"
        footer={
          <>
            <Button variant="ghost" onPress={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="danger" onPress={clearAll}>
              确认清空
            </Button>
          </>
        }
      >
        <p className="flex items-center gap-2 text-sm text-foreground">
          <BellRing className="size-4 text-warning" />
          当前共有 {totalRecords} 条记录，确认全部删除吗？
        </p>
      </Dialog>
    </div>
  );
}
