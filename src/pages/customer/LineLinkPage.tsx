import { useCallback, useEffect, useRef, useState } from "react";
import liff from "@line/liff";
import { lineLinkApi } from "../../api/lineLinkApi";

const LIFF_ID = (import.meta.env.VITE_LIFF_ID ?? "").toString().trim();

// 導向 LINE 帳號連動頁前先設旗標，使用者回到 LIFF Endpoint 時用來顯示成功訊息。
const PENDING_KEY = "merd_line_link_pending";
// 呼叫 liff.login() 會整頁跳轉，回來後用此旗標自動接續綁定流程。
const RESUME_KEY = "merd_line_link_resume";

type ViewState =
  | "initializing" // LIFF 初始化中
  | "config-error" // 未設定 VITE_LIFF_ID
  | "not-in-line" // 非 LINE App 環境，無法取得 userId
  | "ready" // 可開始綁定
  | "linking" // 綁定中（等待導向 / API）
  | "linked" // 綁定成功
  | "error"; // 發生錯誤

function extractMessage(err: unknown): { status?: number; message?: string } {
  const axiosErr = err as {
    response?: { status?: number; data?: { message?: string } };
  };
  return {
    status: axiosErr?.response?.status,
    message: axiosErr?.response?.data?.message?.trim() || undefined,
  };
}

export default function LineLinkPage() {
  const [view, setView] = useState<ViewState>(LIFF_ID ? "initializing" : "config-error");
  const [errorMessage, setErrorMessage] = useState<string>("");
  // 避免 React 18 StrictMode 下重複初始化 LIFF
  const initOnce = useRef(false);

  // Step 3 + 4：呼叫後端取得 accountLinkUrl，並整頁導向 LINE 驗證頁
  const callStartLinkApi = useCallback(async (lineUserId: string) => {
    setView("linking");
    setErrorMessage("");
    try {
      const { accountLinkUrl } = await lineLinkApi.start(lineUserId);
      // 標記正在綁定，回到 Endpoint 時顯示成功
      sessionStorage.setItem(PENDING_KEY, "1");
      // 必須整頁跳轉，不可用 iframe / popup
      window.location.href = accountLinkUrl;
    } catch (err) {
      const { status, message } = extractMessage(err);
      if (status === 409) {
        setErrorMessage(message ?? "此 LINE 帳號已被其他會員綁定，或您已綁定其他 LINE 帳號");
      } else if (status === 400) {
        setErrorMessage("LINE 使用者資訊有誤，請重新嘗試");
      } else if (status === 503) {
        setErrorMessage("LINE 綁定服務尚未開通，請稍後再試或聯絡客服");
      } else {
        setErrorMessage("綁定失敗，請稍後再試");
      }
      setView("error");
    }
  }, []);

  // Step 1 + 2：初始化 LIFF、判斷環境，必要時自動接續綁定流程
  const startLineLink = useCallback(async () => {
    setView("linking");
    setErrorMessage("");

    // 非 LINE App 內無法取得 userId
    if (!liff.isInClient()) {
      setView("not-in-line");
      return;
    }

    // 未登入 LINE → 導去登入，回來後用 RESUME_KEY 自動接續
    if (!liff.isLoggedIn()) {
      sessionStorage.setItem(RESUME_KEY, "1");
      liff.login();
      return;
    }

    try {
      const profile = await liff.getProfile();
      await callStartLinkApi(profile.userId);
    } catch {
      setErrorMessage("無法取得 LINE 使用者資訊，請重新嘗試");
      setView("error");
    }
  }, [callStartLinkApi]);

  // 初始化 LIFF（僅執行一次）
  useEffect(() => {
    if (initOnce.current) return;
    initOnce.current = true;

    // LIFF ID 未設定時，初始 state 已為 config-error，直接略過初始化。
    if (!LIFF_ID) return;

    let cancelled = false;

    (async () => {
      try {
        await liff.init({ liffId: LIFF_ID });
        if (cancelled) return;

        // 從 LINE 帳號連動頁返回 → 顯示成功
        if (sessionStorage.getItem(PENDING_KEY) === "1") {
          sessionStorage.removeItem(PENDING_KEY);
          sessionStorage.removeItem(RESUME_KEY);
          setView("linked");
          return;
        }

        // 從 liff.login() 返回 → 自動接續綁定
        if (sessionStorage.getItem(RESUME_KEY) === "1") {
          sessionStorage.removeItem(RESUME_KEY);
          if (liff.isInClient() && liff.isLoggedIn()) {
            void startLineLink();
            return;
          }
        }

        if (!liff.isInClient()) {
          setView("not-in-line");
          return;
        }

        setView("ready");
      } catch {
        if (cancelled) return;
        setErrorMessage("LINE 初始化失敗，請重新整理頁面再試一次");
        setView("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startLineLink]);

  async function handleUnlink() {
    const confirmed = window.confirm("確定要解除 LINE 帳號綁定嗎？");
    if (!confirmed) return;

    setView("linking");
    setErrorMessage("");
    try {
      await lineLinkApi.unlink();
      setView("ready");
      setErrorMessage("");
      window.alert("已解除 LINE 帳號綁定");
    } catch {
      setErrorMessage("解除綁定失敗，請稍後再試");
      setView("error");
    }
  }

  const liffUrl = LIFF_ID ? `https://liff.line.me/${LIFF_ID}` : "";
  const qrSrc = liffUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(liffUrl)}`
    : "";

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <p className="register-kicker">LINE</p>
          <h1 className="register-title">綁定 LINE 帳號</h1>
          <p className="register-subtitle">
            綁定後，訂單與預約等通知將透過 LINE 主動推播給您。
          </p>
        </div>

        <div className="line-link-body">
          {view === "initializing" && (
            <div className="line-link-status">
              <span className="line-link-spinner" aria-hidden="true" />
              <p>正在初始化 LINE…</p>
            </div>
          )}

          {view === "linking" && (
            <div className="line-link-status">
              <span className="line-link-spinner" aria-hidden="true" />
              <p>處理中，請稍候…</p>
            </div>
          )}

          {view === "config-error" && (
            <p className="register-error">
              尚未設定 LIFF ID（VITE_LIFF_ID），請聯絡網站管理員。
            </p>
          )}

          {view === "not-in-line" && (
            <div className="line-link-status">
              <p className="register-hint" style={{ textAlign: "center" }}>
                請使用 <strong>LINE App</strong> 開啟此頁面才能進行綁定。
                <br />
                可用 LINE 掃描下方 QR Code，或透過 LINE 開啟連結。
              </p>
              {qrSrc && (
                <img
                  className="line-link-qr"
                  src={qrSrc}
                  alt="使用 LINE 掃描以開啟綁定頁面"
                  width={180}
                  height={180}
                />
              )}
            </div>
          )}

          {view === "ready" && (
            <div className="line-link-actions">
              <button
                type="button"
                className="line-link-bind-btn"
                onClick={() => void startLineLink()}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                綁定 LINE 帳號
              </button>
              <p className="register-hint" style={{ textAlign: "center" }}>
                點擊後會跳轉至 LINE 進行帳號連動確認。
              </p>
            </div>
          )}

          {view === "linked" && (
            <div className="line-link-actions">
              <p className="register-success" style={{ textAlign: "center" }}>
                LINE 帳號綁定成功！往後將透過 LINE 接收通知。
              </p>
              <button
                type="button"
                className="line-link-unbind-btn"
                onClick={() => void handleUnlink()}
              >
                解除綁定
              </button>
            </div>
          )}

          {view === "error" && (
            <div className="line-link-actions">
              {errorMessage && (
                <p className="register-error" style={{ textAlign: "center" }}>
                  {errorMessage}
                </p>
              )}
              <button
                type="button"
                className="line-link-bind-btn"
                onClick={() => void startLineLink()}
              >
                重新嘗試
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
