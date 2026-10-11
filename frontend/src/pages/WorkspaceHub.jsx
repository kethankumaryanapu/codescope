import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import mammoth from "mammoth";
import MetricCard from "../components/MetricCard";
import AIStatus from "../components/AIStatus";
import DependencyGraph from "../components/DependencyGraph";
import ImpactFileList from "../components/ImpactFileList";
import MarkdownView from "../components/MarkdownView";
import Loader from "../components/Loader";
import ReviewCard from "../components/ReviewCard";
import IntelligenceCore from "../components/IntelligenceCore";
import AgentCard from "../components/AgentCard";
import PipelineStatus from "../components/PipelineStatus";
import { useAnalysis } from "../context/AnalysisContext";
import {
  Sparkles,
  ArrowRight,
  FolderGit2,
  CheckCircle2,
  RefreshCw,
  GitBranch,
  FolderTree,
  Plus,
  Layers,
  Bot,
  Zap,
  Cpu,
  ShieldCheck,
  Activity,
  Key,
  Database,
  Save,
  User,
  Copy,
  Download,
  Send,
  Check,
  AlertCircle,
  X,
  Search,
  Trash2,
  Eye,
  Code2,
  Terminal,
  FileCode,
  FileText,
  Upload,
  FileUp,
  FileCheck,
  Paperclip,
  File,
  ArrowUpRight,
} from "lucide-react";
import "./WorkspaceHub.css";

// Requirement presets
const REQUIREMENT_PRESETS = [

  {
    id: "JIRA-241",
    title: "Multi-Factor Authentication on High-Value Orders",
    text: `Requirement: Multi-Factor Authentication & Discount Rate Limit
1. Implement 2FA TOTP verification on checkout for high-value orders (> $500).
2. Validate discount percentage in discountService: Max 40% threshold for non-admin accounts.
3. Update Order model to record 'requires2FA' boolean flag.
4. Add comprehensive unit tests in checkout.test.js for edge cases.`,
  },
  {
    id: "JIRA-182",
    title: "OAuth2 & JWT Token Refresh Pipeline",
    text: `Requirement: JWT Silent Refresh & Revocation
1. Add rotating refresh tokens with 7-day expiration in authController.
2. Maintain blacklisted revoked tokens in in-memory / Redis cache.
3. Update SecurityConfig and user middleware to enforce token expiration checks.`,
  },
  {
    id: "JIRA-305",
    title: "Stripe Webhook Signature Verification & Idempotency",
    text: `Requirement: Webhook Security & Idempotency Key Tracking
1. Verify Stripe-Signature header before processing payment_intent.succeeded.
2. Record processed event IDs in Order database to prevent duplicate fulfillment.
3. Handle replay attacks and network retry scenarios.`,
  },
];


// Agents List
const AGENTS_LIST = [
  {
    id: "coord-agent",
    name: "Coordinator Agent",
    role: "Orchestration & Workflow Management",
    model: "nvidia/llama-3.1-nemotron-70b-instruct",
    status: "Active",
    tasksCompleted: 142,
    accuracy: "99.2%",
  },
  {
    id: "req-agent",
    name: "Requirement Analysis Agent",
    role: "BRD / Jira parsing and semantic classification",
    model: "nvidia/llama-3.1-nemotron-70b-instruct",
    status: "Active",
    tasksCompleted: 98,
    accuracy: "97.8%",
  },
  {
    id: "impact-agent",
    name: "Code Impact Agent",
    role: "AST parsing, dependency mapping, change tracing",
    model: "nvidia/llama-3.1-nemotron-70b-instruct",
    status: "Active",
    tasksCompleted: 85,
    accuracy: "96.4%",
  },
  {
    id: "review-agent",
    name: "Senior Pre-Review Agent",
    role: "Automated code inspection, linting, regression risk",
    model: "nvidia/llama-3.1-nemotron-70b-instruct",
    status: "Active",
    tasksCompleted: 110,
    accuracy: "98.1%",
  },
  {
    id: "pr-agent",
    name: "PR Generator Agent",
    role: "Automated PR drafting and release documentation",
    model: "nvidia/llama-3.1-nemotron-70b-instruct",
    status: "Active",
    tasksCompleted: 76,
    accuracy: "99.0%",
  },
];

// Settings Helpers
const INPUT_STYLE = {
  width: "100%",
  padding: "12px 16px",
  background: "var(--surface-2)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  color: "var(--text)",
  fontSize: "14px",
  outline: "none",
};

const LABEL_STYLE = {
  display: "block",
  color: "var(--text-2)",
  marginBottom: "8px",
  fontSize: "14px",
  fontWeight: 500,
};

const HINT_STYLE = {
  fontSize: "12px",
  color: "var(--text-3)",
  marginTop: "5px",
};

const WorkspaceHub = ({ activeTab = "overview" }) => {
  const navigate = useNavigate();
  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    history,
    dashboardStats,
    requirementId,
    setRequirementId,
    brdText,
    setBrdText,
    gitDiff,
    setGitDiff,
    repoFiles,
    isLoadingFiles,
    addCustomFile,
    batchAddCustomFiles,
    removeCustomFile,
    clearAllFiles,
    isAnalyzing,
    analysisResult,
    analysisData,
    analysisError,
    isReviewing,
    reviewResult,
    reviewData,
    reviewError,
    workflow,
    lastUpdated,
    isLiveSyncing,
    runRepoScan,
    runImpactAnalysis,
    runCodeReview,
  } = useAnalysis();

  // Local Sync and action states
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // File Manager states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModuleFilter, setActiveModuleFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  const [fileActionMsg, setFileActionMsg] = useState("");
  const [copiedPath, setCopiedPath] = useState(null);

  // File Add form state
  const [filePathInput, setFilePathInput] = useState("");
  const [moduleInput, setModuleInput] = useState("Controllers");
  const [codeInput, setCodeInput] = useState("");
  const [fileFormError, setFileFormError] = useState("");

  // Batch add files state
  const [batchRawText, setBatchRawText] = useState("");
  const [batchFilesPreview, setBatchFilesPreview] = useState([]);

  // Requirement document upload states
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [uploadedDocInfo, setUploadedDocInfo] = useState(null);
  const [dragOverDoc, setDragOverDoc] = useState(false);
  const docInputRef = useRef(null);

  // Settings states
  const [aiModel, setAiModel] = useState("nvidia/llama-3.1-nemotron-70b-instruct");
  const [githubUsername, setGithubUsername] = useState("");
  const [jiraUsername, setJiraUsername] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  // Handle document file upload (.docx, .doc, .txt, .md, .pdf)
  const handleDocFileSelect = async (file) => {
    if (!file) return;
    setIsExtractingDoc(true);
    try {
      const fileName = file.name;
      const ext = fileName.split(".").pop().toLowerCase();
      let extractedText = "";

      if (ext === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value || "";
      } else if (ext === "txt" || ext === "md" || ext === "json") {
        extractedText = await file.text();
      } else if (ext === "doc") {
        const raw = await file.text();
        extractedText = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").replace(/\s{2,}/g, " ").trim();
      } else {
        extractedText = await file.text();
      }

      if (!extractedText.trim()) {
        throw new Error("Could not extract text from document. Please ensure the file contains readable requirement text.");
      }

      const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_\-\s]/g, "");
      setBrdText(extractedText);
      setRequirementId(cleanTitle.substring(0, 24).toUpperCase());
      setUploadedDocInfo({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        chars: extractedText.length,
        lines: extractedText.split("\n").length,
      });
    } catch (err) {
      alert("Document Parsing Error: " + err.message);
    } finally {
      setIsExtractingDoc(false);
    }
  };

  const handleClearDoc = () => {
    setUploadedDocInfo(null);
    setBrdText("");
    if (docInputRef.current) docInputRef.current.value = "";
  };

  // Populate settings form from backend profile
  useEffect(() => {
    const token = localStorage.getItem("codescope_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch("/api/me", { headers })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (data.user) {
          setGithubUsername(data.user.githubUsername || "");
          setJiraUsername(data.user.jiraUsername || "");
        }
      })
      .catch(() => {});
  }, [activeTab]);

  // Sync AST trigger
  const handleSyncRepo = async () => {
    setSyncing(true);
    try {
      await runRepoScan(selectedRepo?.id);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setSyncing(false), 800);
    }
  };

  // Requirement preset selection
  const handleSelectPreset = (preset) => {
    setRequirementId(preset.id);
    setBrdText(preset.text);
  };

  // Run impact analysis
  const handleAnalyze = async () => {
    try {
      await runImpactAnalysis(brdText, selectedRepo?.id, requirementId);
      navigate("/impact-analysis");
    } catch (err) {
      console.error(err);
    }
  };

  // Run code review
  const handleReview = async () => {
    try {
      await runCodeReview(gitDiff, requirementId);
    } catch (err) {
      console.error(err);
    }
  };

  // Copy PR details
  const handleCopyPR = () => {
    const defaultTitle = reviewData?.prDraft?.title || `[${requirementId || "JIRA-241"}] AI Impact & Pre-Review: Multi-Factor Authentication & Order Rate Limit`;
    const defaultDescription = reviewResult
      ? `## Automated AI Pre-Review Summary (${requirementId})\n\n${reviewResult}\n\n---\n*Generated by CodeScope Multi-Agent Platform*`
      : `## Summary\n� Implemented 2FA TOTP verification on checkout for high-value orders (> $500).\n� Enforced 40% maximum discount threshold in discountService.\n� Updated Order schema to store requires2FA boolean status.\n� Added test coverage in tests/checkout.test.js.`;

    navigator.clipboard.writeText(`${defaultTitle}\n\n${defaultDescription}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Export PR markdown
  const handleExportPR = () => {
    const defaultTitle = reviewData?.prDraft?.title || `[${requirementId || "JIRA-241"}] AI Impact & Pre-Review: Multi-Factor Authentication & Order Rate Limit`;
    const defaultDescription = reviewResult
      ? `## Automated AI Pre-Review Summary (${requirementId})\n\n${reviewResult}\n\n---\n*Generated by CodeScope Multi-Agent Platform*`
      : `## Summary\n� Implemented 2FA TOTP verification on checkout for high-value orders (> $500).\n� Enforced 40% maximum discount threshold in discountService.\n� Updated Order schema to store requires2FA boolean status.\n� Added test coverage in tests/checkout.test.js.`;

    const blob = new Blob([`${defaultTitle}\n\n${defaultDescription}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PULL_REQUEST_${requirementId || "DRAFT"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Submit PR
  const handleSubmitPR = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsError("");

    const token = localStorage.getItem("codescope_token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      const res = await fetch("/api/me/integrations", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ githubUsername, jiraUsername }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch {
      setSettingsError("Could not save. Make sure the backend server is active.");
    } finally {
      setSettingsSaving(false);
    }
  };

  // File Manager Handlers
  const displayFileMsg = (msg) => {
    setFileActionMsg(msg);
    setTimeout(() => setFileActionMsg(""), 3500);
  };

  const handleLocalFilesSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsSubmittingFile(true);
    try {
      const readPromises = selectedFiles.map((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const rawPath = file.webkitRelativePath || file.name;
            const p = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
            let mod = "General";
            const lp = p.toLowerCase();
            if (lp.includes("controller")) mod = "Controllers";
            else if (lp.includes("service")) mod = "Services";
            else if (lp.includes("model")) mod = "Models";
            else if (lp.includes("middleware")) mod = "Middlewares";
            else if (lp.includes("test") || lp.includes("spec")) mod = "Tests";
            else if (lp.includes("component") || lp.includes("page")) mod = "UI / Frontend";

            resolve({
              filePath: p,
              content: reader.result || "",
              module: mod,
              lineCount: (reader.result || "").split("\n").length,
            });
          };
          reader.onerror = reject;
          reader.readAsText(file);
        });
      });

      const parsedFiles = await Promise.all(readPromises);
      await batchAddCustomFiles(parsedFiles);
      displayFileMsg(`Successfully pushed & indexed ${parsedFiles.length} file(s) into codebase.`);
    } catch (err) {
      alert("Error reading local files: " + err.message);
    } finally {
      setIsSubmittingFile(false);
      e.target.value = "";
    }
  };

  const handleSingleLocalFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const p = (file.webkitRelativePath || file.name).replace(/\\/g, "/").replace(/^\/+/, "");
      setFilePathInput(p);
      setCodeInput(reader.result || "");
      let mod = "Controllers";
      const lp = p.toLowerCase();
      if (lp.includes("service")) mod = "Services";
      else if (lp.includes("model")) mod = "Models";
      else if (lp.includes("middleware")) mod = "Middlewares";
      else if (lp.includes("test")) mod = "Tests";
      setModuleInput(mod);
    };
    reader.readAsText(file);
  };

  const handleOpenAddFileModal = (preset = null) => {
    if (preset) {
      setFilePathInput(preset.filePath);
      setModuleInput(preset.module);
      setCodeInput(preset.content);
    } else {
      setFilePathInput("");
      setModuleInput("Controllers");
      setCodeInput("");
    }
    setFileFormError("");
    setShowAddModal(true);
  };

  const handleSaveNewFile = async (e) => {
    e.preventDefault();
    setFileFormError("");

    if (!filePathInput.trim()) {
      setFileFormError("Please specify a path relative to root");
      return;
    }

    const normalizedPath = filePathInput.trim().replace(/^[\/\\]+/, "");
    setIsSubmittingFile(true);
    try {
      await addCustomFile({
        filePath: normalizedPath,
        content: codeInput,
        module: moduleInput,
      });
      setShowAddModal(false);
      displayFileMsg(`File '${normalizedPath}' indexed successfully.`);
    } catch (err) {
      setFileFormError(err.message || "Failed to index file.");
    } finally {
      setIsSubmittingFile(false);
    }
  };

  const handleDeleteFile = async (file) => {
    const idOrPath = file.filePath || file.id;
    if (!window.confirm(`Are you sure you want to delete '${file.filePath}' from codebase registry?`)) {
      return;
    }
    try {
      await removeCustomFile(idOrPath);
      displayFileMsg(`Removed '${file.filePath}' from codebase index.`);
      if (viewingFile?.filePath === file.filePath || viewingFile?.id === file.id) {
        setViewingFile(null);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClearAllFiles = async () => {
    if (!window.confirm("Are you sure you want to delete ALL indexed files in this repository? This cannot be undone.")) {
      return;
    }
    setIsSubmittingFile(true);
    try {
      await clearAllFiles();
      setViewingFile(null);
      displayFileMsg("All codebase files cleared from registry. You can now upload or add your new files.");
    } catch (err) {
      alert("Error clearing files: " + err.message);
    } finally {
      setIsSubmittingFile(false);
    }
  };


  const handleParseBatchText = () => {
    if (!batchRawText.trim()) return;
    const chunks = batchRawText.split(/(?:^|\n)---+\s*([a-zA-Z0-9_\-./\\]+)\s*---+/g);
    const result = [];

    if (chunks.length > 1) {
      for (let i = 1; i < chunks.length; i += 2) {
        const path = chunks[i]?.trim();
        const code = chunks[i + 1]?.trim() || "";
        if (path) {
          result.push({
            filePath: path.replace(/^[\/\\]+/, ""),
            content: code,
            module: path.toLowerCase().includes("controller")
              ? "Controllers"
              : path.toLowerCase().includes("service")
              ? "Services"
              : "General",
            lineCount: code.split("\n").length,
          });
        }
      }
    } else {
      result.push({
        filePath: "src/customFile.js",
        content: batchRawText,
        module: "Services",
        lineCount: batchRawText.split("\n").length,
      });
    }
    setBatchFilesPreview(result);
  };

  const handleConfirmBatchUpload = async () => {
    if (batchFilesPreview.length === 0) return;
    setIsSubmittingFile(true);
    try {
      await batchAddCustomFiles(batchFilesPreview);
      setShowBatchModal(false);
      setBatchFilesPreview([]);
      displayFileMsg(`Indexed ${batchFilesPreview.length} files successfully.`);
    } catch (err) {
      alert("Error uploading batch: " + err.message);
    } finally {
      setIsSubmittingFile(false);
    }
  };

  const handleCopyPath = (path) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Filtered files count calculation
  const filteredFiles = useMemo(() => {
    return repoFiles.filter((f) => {
      const p = (f.filePath || f.rootPath || "").toLowerCase();
      const matchesSearch = p.includes(searchQuery.toLowerCase()) || (f.module || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesModule = activeModuleFilter === "ALL" || f.module === activeModuleFilter;
      return matchesSearch && matchesModule;
    });
  }, [repoFiles, searchQuery, activeModuleFilter]);

  const totalTrackedFiles = repoFiles.length || dashboardStats?.totalTrackedFiles || repositories.reduce((acc, r) => acc + (r.filesCount || 0), 0);
  const liveConnectedRepos = dashboardStats?.connectedRepos ?? repositories.length;
  const liveRequirements = dashboardStats?.indexedRequirements ?? history.length + 15;
  const liveAIReviewScore = dashboardStats?.aiReviewScore ?? "96%";
  const liveCoverage = dashboardStats?.repoTestCoverage ?? selectedRepo?.coverage ?? "91%";

  const fileCount = analysisData?.stats?.impactedFilesCount || (analysisData?.impactedFiles?.length || 4);
  const serviceCount = analysisData?.stats?.affectedServicesCount || 2;
  const testCount = analysisData?.stats?.testSuitesCount || 1;
  const confidence = analysisData?.stats?.confidence || "97%";

  return (
    <>
      <div className="workspace-hub">

          {/* -- Hero Panel ------------------------------------------- */}
          <div className="wh-hero">
            <div className="wh-hero-inner">
              <div className="wh-hero-left">
                <div className="wh-status-chip">
                  <span
                    className="wh-status-dot"
                    style={{ background: isLiveSyncing ? "#F59E0B" : "#22C55E" }}
                  />
                  {isLiveSyncing
                    ? "Syncing live data�"
                    : `Live connection active � Refreshed ${lastUpdated || "just now"}`}
                </div>
                <h1>AI Workspace Hub</h1>
                <p>
                  Consolidated dashboard orchestrating semantic codebase indexing,
                  requirement mapping, and Senior Staff AI pre-reviews.
                </p>
              </div>

              <div className="wh-hero-controls">
                <span className="wh-repo-label">Repo: {selectedRepo?.name}</span>
                <select
                  className="wh-repo-select"
                  value={selectedRepo?.id || "repo-1"}
                  onChange={(e) => {
                    const repo = repositories.find((r) => r.id === e.target.value);
                    if (repo) setSelectedRepo(repo);
                  }}
                >
                  {repositories.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.branch})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* -- Metric Cards ----------------------------------------- */}
          {(activeTab === "overview" || activeTab === "analytics") && (
            <div className="wh-metric-grid">
              {/* Connected Repos */}
              <div
                className="wh-metric-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/files")}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/files")}
                title="Click to view and manage connected repository files"
              >
                <div className="wh-metric-header">
                  <span className="wh-metric-title">Connected Repos</span>
                  <div className="wh-metric-arrow">
                    <ArrowUpRight size={16} color="#76b900" />
                  </div>
                </div>
                <div className="wh-metric-value" style={{ color: "#22C55E" }}>
                  {liveConnectedRepos}
                </div>
                <div className="wh-metric-sub">
                  {selectedRepo?.name || "codescope-backend"} active
                </div>
              </div>

              {/* Indexed Stories */}
              <div
                className="wh-metric-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/requirements")}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/requirements")}
                title="Click to configure and analyze requirement stories"
              >
                <div className="wh-metric-header">
                  <span className="wh-metric-title">Indexed Stories</span>
                  <div className="wh-metric-arrow">
                    <ArrowUpRight size={16} color="#76b900" />
                  </div>
                </div>
                <div className="wh-metric-value" style={{ color: "#76b900" }}>
                  {liveRequirements}
                </div>
                <div className="wh-metric-sub">Requirements parsed</div>
              </div>

              {/* AI Pre-Review Score */}
              <div
                className="wh-metric-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/code-review")}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/code-review")}
                title="Click to run Senior AI Code Pre-Review"
              >
                <div className="wh-metric-header">
                  <span className="wh-metric-title">AI Pre-Review Score</span>
                  <div className="wh-metric-arrow">
                    <ArrowUpRight size={16} color="#76b900" />
                  </div>
                </div>
                <div className="wh-metric-value" style={{ color: "#F59E0B" }}>
                  {liveAIReviewScore}
                </div>
                <div className="wh-metric-sub">Average code validation</div>
              </div>

              {/* Test Coverage */}
              <div
                className="wh-metric-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/analytics")}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/analytics")}
                title="Click to inspect test coverage and quality metrics"
              >
                <div className="wh-metric-header">
                  <span className="wh-metric-title">Test Coverage</span>
                  <div className="wh-metric-arrow">
                    <ArrowUpRight size={16} color="#76b900" />
                  </div>
                </div>
                <div className="wh-metric-value" style={{ color: "#38BDF8" }}>
                  {liveCoverage}
                </div>
                <div className="wh-metric-sub">{totalTrackedFiles} tracked source files</div>
              </div>
            </div>
          )}

          {/* -- OVERVIEW TAB ------------------------------------------ */}
          {activeTab === "overview" && (
            <div className="wh-overview-grid">

              {/* -- Left Column --------------------------------------- */}
              <div className="wh-col-left">

                {/* Active Requirement Snapshot */}
                <div className="wh-card">
                  <div className="wh-card-header">
                    <div className="wh-card-header-left">
                      <FileText size={17} color="#76b900" />
                      <h2 className="wh-card-title">Active Requirement Target</h2>
                    </div>
                    <span className="wh-req-id-badge">{requirementId}</span>
                  </div>
                  <p className="wh-req-text">
                    {brdText.substring(0, 180)}...
                  </p>
                  <div className="wh-actions">
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="primary-btn"
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", fontSize: "13px" }}
                    >
                      <Sparkles size={14} />
                      {isAnalyzing ? "Analyzing AST..." : "Run Semantic Analysis"}
                    </button>
                    <button
                      onClick={() => navigate("/requirements")}
                      className="secondary-btn"
                      style={{ padding: "10px 16px", fontSize: "13px" }}
                    >
                      Configure Story
                    </button>
                  </div>
                </div>

                {/* Codebase Index Status */}
                <div className="wh-card">
                  <div className="wh-card-header">
                    <div className="wh-card-header-left">
                      <FolderTree size={17} color="#22C55E" />
                      <h2 className="wh-card-title">Codebase Index Status</h2>
                    </div>
                    <button
                      onClick={() => navigate("/files")}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#76b900",
                        fontSize: "13px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Manage files ({totalTrackedFiles})
                    </button>
                  </div>
                  <div className="wh-repo-info-box">
                    <p>{selectedRepo?.name}</p>
                    <small>
                      Branch: <strong style={{ color: "var(--wh-text, #f2f4f7)" }}>{selectedRepo?.branch}</strong>
                      {" "}� Status:{" "}
                      <span style={{ color: "#22C55E" }}>Active</span>
                    </small>
                  </div>
                  <button
                    onClick={handleSyncRepo}
                    disabled={syncing}
                    className="secondary-btn"
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "13px" }}
                  >
                    <RefreshCw size={13} className={syncing ? "spin" : ""} />
                    {syncing ? "Scanning codebase AST..." : "Force Index Sync"}
                  </button>
                </div>

                {/* Recent AI Analysis Runs */}
                <div className="wh-card">
                  <h2 className="wh-card-title" style={{ marginBottom: "16px" }}>
                    Recent AI Analysis Runs
                  </h2>
                  <div style={{ overflowX: "auto" }}>
                    <table className="wh-table">
                      <thead>
                        <tr>
                          <th>Story / Title</th>
                          <th>Status</th>
                          <th>Confidence</th>
                          <th style={{ textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice(0, 3).map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div className="wh-row-id">{item.requirementId}</div>
                              <div className="wh-row-sub">{item.title}</div>
                            </td>
                            <td>
                              <span style={{ color: "#22C55E", fontWeight: 600 }}>
                                ? {item.status}
                              </span>
                            </td>
                            <td style={{ color: "#76b900", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                              {item.confidence}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                onClick={() => navigate("/impact-analysis")}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#76b900",
                                  cursor: "pointer",
                                  fontSize: "12.5px",
                                }}
                              >
                                View Map ?
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* -- Right Column --------------------------------------- */}
              <div className="wh-col-right">
                <div className="wh-intel-core">
                  <IntelligenceCore size={320} />
                </div>
                <AIStatus />
                <div className="wh-action-card">
                  <button
                    onClick={() => navigate("/code-review")}
                    className="primary-btn"
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(118,185,0,0.12)",
                      border: "1px solid rgba(118,185,0,0.3)",
                      color: "#76b900",
                    }}
                  >
                    <ShieldCheck size={16} /> AI Code Pre-Review
                  </button>
                  <button
                    onClick={() => navigate("/pr-generator")}
                    className="primary-btn"
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                      background: "#059669",
                    }}
                  >
                    <Send size={16} /> Draft Pull Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------------
              TAB 2: CODEBASE FILES (INDEXER)
              -------------------------------------------------------------------------- */}
          {activeTab === "files" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ color: "var(--text)", fontSize: "20px", fontWeight: "600", margin: 0 }}>Codebase Indexer Registry</h2>
                  <p style={{ color: "var(--text-3)", fontSize: "13px", margin: "4px 0 0" }}>Manage files target for requirement analysis scanning and AST dependency graph building.</p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={handleSyncRepo} disabled={syncing} className="secondary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                    <RefreshCw size={13} className={syncing ? "spin" : ""} /> Sync AST
                  </button>
                  <label className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "10px 16px", cursor: "pointer", margin: 0 }}>
                    <Upload size={14} /> Upload Local Files
                    <input type="file" multiple onChange={handleLocalFilesSelect} style={{ display: "none" }} />
                  </label>
                  <button onClick={() => handleOpenAddFileModal(null)} className="secondary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                    <Plus size={14} /> Add Snippet
                  </button>
                  <button onClick={() => setShowBatchModal(true)} className="secondary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                    Batch Snippets
                  </button>
                  {repoFiles.length > 0 && (
                    <button
                      onClick={handleClearAllFiles}
                      disabled={isSubmittingFile}
                      className="secondary-btn"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12.5px",
                        color: "#FCA5A5",
                        borderColor: "rgba(239, 68, 68, 0.35)",
                        background: "rgba(239, 68, 68, 0.08)",
                      }}
                      title="Clear all tracked files in this repository"
                    >
                      <Trash2 size={13} color="#EF4444" /> Delete All Files
                    </button>
                  )}
                </div>
              </div>

              {/* Status banner */}
              {fileActionMsg && (
                <div style={{ background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#86EFAC", padding: "10px 16px", borderRadius: "10px", fontSize: "13px" }}>
                  {fileActionMsg}
                </div>
              )}

              {/* Filter controls */}
              <div className="card" style={{ padding: "10px", display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: "220px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", display: "flex", alignItems: "center", padding: "8px 12px", gap: "8px" }}>
                  <Search size={15} color="var(--text-3)" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search file registry..."
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--text)", width: "100%", fontSize: "13.5px" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {["ALL", "Controllers", "Services", "Models", "Middlewares", "Tests"].map((mod) => (
                    <button
                      key={mod}
                      onClick={() => setActiveModuleFilter(mod)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "12.5px",
                        borderRadius: "8px",
                        background: activeModuleFilter === mod ? "var(--surface-3)" : "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: activeModuleFilter === mod ? "var(--text)" : "var(--text-3)",
                        cursor: "pointer",
                      }}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid content */}
              <div style={{ display: "grid", gridTemplateColumns: viewingFile ? "1fr 1fr" : "1fr", gap: "20px" }}>
                {/* List Card */}
                <div className="card" style={{ padding: "20px" }}>
                  {isLoadingFiles ? (
                    <Loader text="Loading codebase file registry..." />
                  ) : filteredFiles.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-3)" }}>
                      <FolderTree size={44} style={{ marginBottom: "12px", opacity: 0.4, color: "var(--nvidia)" }} />
                      <h3 style={{ fontSize: "14px", color: "var(--text)", margin: "0 0 6px" }}>
                        {repoFiles.length === 0 ? "Registry is Completely Clear" : "No files matching search"}
                      </h3>
                      <p style={{ fontSize: "13px", maxWidth: "440px", margin: "0 auto 20px", color: "var(--text-3)" }}>
                        {repoFiles.length === 0
                          ? "All old files have been deleted. You can now upload your fresh project files or paste code snippets."
                          : "Try clearing your search query or switching module filters."}
                      </p>
                      {repoFiles.length === 0 && (
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                          <label className="primary-btn" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "10px 18px", cursor: "pointer", margin: 0 }}>
                            <Upload size={14} /> Upload Files from Computer
                            <input type="file" multiple onChange={handleLocalFilesSelect} style={{ display: "none" }} />
                          </label>
                          <button onClick={() => handleOpenAddFileModal(null)} className="secondary-btn" style={{ fontSize: "13px", padding: "10px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <Plus size={14} /> Add Snippet
                          </button>
                          <button onClick={() => setShowBatchModal(true)} className="secondary-btn" style={{ fontSize: "13px", padding: "10px 16px" }}>
                            Batch Paste
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ color: "var(--text-3)", fontSize: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          <th align="left" style={{ paddingBottom: "10px" }}>File Path</th>
                          <th align="left" style={{ paddingBottom: "10px" }}>Module</th>
                          <th align="left" style={{ paddingBottom: "10px" }}>Lines</th>
                          <th align="right" style={{ paddingBottom: "10px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFiles.map((file) => (
                          <tr key={file.id || file.filePath} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "13px" }}>
                            <td style={{ padding: "12px 0", fontFamily: "monospace", color: "var(--text)" }}>{file.filePath}</td>
                            <td>
                              <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.07)", padding: "3px 8px", borderRadius: "6px", color: "var(--text-2)" }}>
                                {file.module}
                              </span>
                            </td>
                            <td style={{ color: "var(--text-3)" }}>{file.lineCount || 0}</td>
                            <td align="right">
                              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button
                                  onClick={() => setViewingFile(file)}
                                  style={{ background: "transparent", border: "none", color: "var(--nvidia)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                  <Eye size={13} /> View
                                </button>
                                <button
                                  onClick={() => handleDeleteFile(file)}
                                  style={{ background: "transparent", border: "none", color: "#EF4444", cursor: "pointer" }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* View Code Panel */}
                {viewingFile && (
                  <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", height: "540px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <div>
                        <h3 style={{ fontSize: "15px", margin: 0, fontFamily: "monospace", color: "#F8FAFC" }}>
                          {viewingFile.filePath.split("/").pop()}
                        </h3>
                        <small style={{ color: "var(--text-3)", fontFamily: "monospace" }}>{viewingFile.filePath}</small>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => handleCopyPath(viewingFile.filePath)}
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", color: "var(--text)", cursor: "pointer" }}
                        >
                          {copiedPath === viewingFile.filePath ? "Copied!" : "Copy Path"}
                        </button>
                        <button
                          onClick={() => setViewingFile(null)}
                          style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer" }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ flex: 1, overflow: "auto", background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px" }}>
                      <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "12.5px", color: "var(--text-2)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                        {viewingFile.content || "// No code content uploaded for this indexed reference."}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------------
              TAB 3: REQUIREMENT ANALYSIS
              -------------------------------------------------------------------------- */}
          {activeTab === "requirement" && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "25px" }}>
              {/* Left Column Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Active Files Context Indicator */}
                <div className="card" style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12.5px", color: "var(--text-3)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <FolderTree size={14} color="var(--nvidia)" /> Target Codebase Files Context (First 5):
                    </span>
                    <button onClick={() => navigate("/files")} style={{ background: "transparent", border: "none", color: "var(--nvidia)", fontSize: "12px", cursor: "pointer" }}>
                      Manage files
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {repoFiles.slice(0, 5).map((f, i) => (
                      <code key={i} style={{ background: "var(--surface-2)", color: "var(--text-2)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        {f.filePath || f.rootPath}
                      </code>
                    ))}
                    {repoFiles.length > 5 && (
                      <span style={{ color: "var(--text-3)", fontSize: "11.5px", alignSelf: "center" }}>
                        +{repoFiles.length - 5} more files indexed
                      </span>
                    )}
                  </div>
                </div>

                {/* Preset List */}
                <div className="card" style={{ padding: "20px" }}>
                  <h3 style={{ fontSize: "14.5px", margin: "0 0 10px", color: "var(--text)" }}>?? Load Preset Requirement Story:</h3>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {REQUIREMENT_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: requirementId === p.id ? "var(--surface-3)" : "var(--surface-2)",
                          color: requirementId === p.id ? "var(--text)" : "var(--text-3)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                          fontSize: "12.5px",
                          fontWeight: 500,
                        }}
                      >
                        {p.id}: {p.title.substring(0, 24)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form specifications */}
                <div className="card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <h2 style={{ fontSize: "18px", margin: 0, fontWeight: 600 }}>Requirement Specifications</h2>
                      <p style={{ color: "var(--text-3)", fontSize: "13px", margin: "4px 0 0" }}>
                        Paste requirement text or upload a <strong>.docx / .doc Word document</strong> or BRD file.
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ fontSize: "12.5px", color: "var(--text-3)", fontWeight: "600" }}>Story ID:</label>
                      <input
                        type="text"
                        value={requirementId}
                        onChange={(e) => setRequirementId(e.target.value)}
                        placeholder="e.g. JIRA-241"
                        style={{
                          padding: "6px 12px",
                          background: "var(--surface-2)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "var(--text)",
                          borderRadius: "8px",
                          fontWeight: "bold",
                          width: "130px",
                          fontSize: "13px",
                        }}
                      />
                    </div>
                  </div>

                  {/* Word / Document Drag-and-Drop & Upload Zone */}
                  <input
                    type="file"
                    ref={docInputRef}
                    accept=".docx,.doc,.txt,.md,.json,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDocFileSelect(file);
                    }}
                  />

                  {uploadedDocInfo ? (
                    <div
                      style={{
                        padding: "14px 18px",
                        borderRadius: "14px",
                        background: "rgba(118,185,0,0.08)",
                        border: "1px solid rgba(118,185,0,0.35)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "10px",
                            background: "rgba(99, 102, 241, 0.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--nvidia)",
                          }}
                        >
                          <FileCheck size={20} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ color: "#FFF", fontWeight: "700", fontSize: "13.5px" }}>{uploadedDocInfo.name}</span>
                            <span style={{ fontSize: "11px", background: "rgba(34, 197, 94, 0.2)", color: "#86EFAC", padding: "2px 8px", borderRadius: "999px", fontWeight: "600" }}>
                              Extracted Successfully
                            </span>
                          </div>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-3)" }}>
                            Size: <strong>{uploadedDocInfo.size}</strong> � Text: <strong>{uploadedDocInfo.chars.toLocaleString()} chars</strong> (~{uploadedDocInfo.lines} lines)
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => docInputRef.current?.click()}
                          className="secondary-btn"
                          style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "8px" }}
                        >
                          Replace File
                        </button>
                        <button
                          type="button"
                          onClick={handleClearDoc}
                          style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#FCA5A5",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverDoc(true);
                      }}
                      onDragLeave={() => setDragOverDoc(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverDoc(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleDocFileSelect(file);
                      }}
                      onClick={() => docInputRef.current?.click()}
                      style={{
                        padding: "20px",
                        borderRadius: "14px",
                        background: dragOverDoc ? "rgba(118,185,0,0.12)" : "rgba(255, 255, 255, 0.03)",
                        border: dragOverDoc ? "2px dashed var(--nvidia)" : "1px dashed rgba(255, 255, 255, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        marginBottom: "10px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))",
                            border: "1px solid rgba(118,185,0,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--nvidia)",
                          }}
                        >
                          <FileUp size={22} />
                        </div>
                        <div>
                          <h4 style={{ color: "#FFF", fontSize: "14px", margin: "0 0 2px 0", fontWeight: "600" }}>
                            {isExtractingDoc ? "Extracting text from Word document..." : "Upload Word Document (BRD / Requirement Spec)"}
                          </h4>
                          <p style={{ color: "var(--text-3)", fontSize: "12px", margin: 0 }}>
                            Click to browse or drag & drop <strong>.docx</strong>, <strong>.doc</strong>, <strong>.txt</strong>, <strong>.md</strong> file here
                          </p>
                        </div>
                      </div>

                      <div
                        className="secondary-btn"
                        style={{
                          padding: "8px 16px",
                          fontSize: "12.5px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          pointerEvents: "none",
                        }}
                      >
                        <Upload size={14} /> Browse File
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={8}
                    value={brdText}
                    onChange={(e) => setBrdText(e.target.value)}
                    placeholder="Paste Business Requirement Document (BRD) or Jira story scope, or upload a Word .docx file above..."
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "var(--surface-2)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "var(--text)",
                      fontSize: "13.5px",
                      lineHeight: "1.6",
                      resize: "vertical",
                      outline: "none",
                      marginBottom: "10px",
                    }}
                  />

                  {analysisError && (
                    <div style={{ display: "flex", gap: "10px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#FCA5A5", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "10px" }}>
                      <AlertCircle size={16} style={{ marginTop: "2px" }} />
                      <span>{analysisError}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !brdText.trim()}
                      className="primary-btn"
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", fontSize: "14px" }}
                    >
                      <Sparkles size={16} />
                      {isAnalyzing ? "Gemini AI Mapping Code..." : "Run AI Impact Analysis"}
                    </button>
                    {analysisResult && !isAnalyzing && (
                      <span style={{ color: "#22C55E", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                        <CheckCircle2 size={15} /> Analysis primer generated!
                      </span>
                    )}
                  </div>
                </div>

                {isAnalyzing && (
                  <div className="card" style={{ padding: "20px" }}>
                    <Loader text="AI Multi-Agent coordinator is parsing BRD and indexing AST files..." />
                  </div>
                )}
              </div>

              {/* Right Column Status */}
              <div>
                <AIStatus />
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------------
              TAB 4: IMPACT ANALYSIS MAP
              -------------------------------------------------------------------------- */}
          {activeTab === "impact" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ color: "var(--text)", fontSize: "20px", fontWeight: "600", margin: 0 }}>Impact Mapping Results</h2>
                  <p style={{ color: "var(--text-3)", fontSize: "13px", margin: "4px 0 0" }}>
                    Suggested starting files, dependent callers, and test suite coverages mapping for <strong>{requirementId}</strong>.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => navigate("/requirements")} className="secondary-btn" style={{ fontSize: "12.5px" }}>
                    Edit Story
                  </button>
                  <button onClick={handleAnalyze} disabled={isAnalyzing} className="secondary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                    <RefreshCw size={13} className={isAnalyzing ? "spin" : ""} /> Re-analyze
                  </button>
                  <button onClick={() => navigate("/code-review")} className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "10px 16px" }}>
                    Proceed to Pre-Review <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Metrics cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px" }}>
                <div className="card" style={{ padding: "20px" }}>
                  <p style={{ color: "var(--text-3)", margin: 0, fontSize: "13px" }}>Impacted Files</p>
                  <h1 style={{ color: "#22C55E", margin: "8px 0 0", fontSize: "20px", fontWeight: 700 }}>{fileCount}</h1>
                </div>
                <div className="card" style={{ padding: "20px" }}>
                  <p style={{ color: "var(--text-3)", margin: 0, fontSize: "13px" }}>Affected Services</p>
                  <h1 style={{ color: "var(--nvidia)", margin: "8px 0 0", fontSize: "20px", fontWeight: 700 }}>{serviceCount}</h1>
                </div>
                <div className="card" style={{ padding: "20px" }}>
                  <p style={{ color: "var(--text-3)", margin: 0, fontSize: "13px" }}>Tests to Update</p>
                  <h1 style={{ color: "#F59E0B", margin: "8px 0 0", fontSize: "20px", fontWeight: 700 }}>{testCount}</h1>
                </div>
                <div className="card" style={{ padding: "20px" }}>
                  <p style={{ color: "var(--text-3)", margin: 0, fontSize: "13px" }}>AI Confidence</p>
                  <h1 style={{ color: "#22C55E", margin: "8px 0 0", fontSize: "20px", fontWeight: 700 }}>{confidence}</h1>
                </div>
              </div>

              {/* Advisory Primer Content */}
              <div className="card" style={{ padding: "24px", border: "1px solid rgba(118,185,0,0.2)", background: "var(--surface)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={18} color="var(--nvidia)" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Gemini AI Suggested Code Map</h3>
                  </div>
                  <span style={{ fontSize: "11px", background: "rgba(118,185,0,0.12)", color: "var(--nvidia)", padding: "3px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    AI Advisory Engine
                  </span>
                </div>

                {isAnalyzing ? (
                  <Loader text="Generating map details from semantic index..." />
                ) : analysisResult ? (
                  <MarkdownView content={analysisResult} />
                ) : (
                  <div>
                    <p style={{ color: "var(--text-3)", lineHeight: 1.6, margin: "0 0 10px" }}>
                      Run impact analysis mapping on a requirement story to inspect:
                    </p>
                    <div style={{ paddingLeft: "14px", color: "var(--text-2)", fontSize: "13.5px", lineHeight: 1.8 }}>
                      <p>� <strong>Primary Edit Targets</strong>: Files containing logic block modifications.</p>
                      <p>� <strong>Downstream Impacts</strong>: Caller contracts and schema structures modified.</p>
                      <p>� <strong>Tests to Update</strong>: Coverage files that require testing code assertions.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Dependency Graph */}
              <div className="card" style={{ padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "15.5px", fontWeight: 600 }}>AST Dependency Graph Visualization</h3>
                <DependencyGraph graphData={analysisData?.graph} />
              </div>

              {/* File registry table */}
              <div className="card" style={{ padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "15.5px", fontWeight: 600 }}>Impacted File Registry</h3>
                <ImpactFileList files={analysisData?.impactedFiles || []} />
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------------
              TAB 5: SENIOR AI CODE REVIEW
              -------------------------------------------------------------------------- */}
          {activeTab === "review" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ color: "var(--text)", fontSize: "20px", fontWeight: "600", margin: 0 }}>AI Senior Staff Pre-Review</h2>
                  <p style={{ color: "var(--text-3)", fontSize: "13px", margin: "4px 0 0" }}>Paste Git diff code block to review quality, find regressions, and draft pull request documentation.</p>
                </div>
                <button onClick={() => navigate("/pr-generator")} className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "10px 16px" }}>
                  Draft Pull Request <ArrowRight size={13} />
                </button>
              </div>

              {/* Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px" }}>
                <ReviewCard title="Quality Score" value={reviewData?.qualityScore || "95/100"} color="#22C55E" />
                <ReviewCard title="Regression Risk" value={reviewData?.regressionRisk || "Low-Med"} color="#F59E0B" />
                <ReviewCard title="Test Gap Detection" value={reviewData?.testGapsCount ? `${reviewData.testGapsCount} Missing` : "1 Missing"} color="var(--nvidia)" />
                <ReviewCard title="Security Clearance" value={reviewData?.securityStatus || "Pass"} color="#22C55E" />
              </div>

              {/* Git Diff Form */}
              <div className="card" style={{ padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Code2 size={18} color="var(--nvidia)" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Committed Git Diff Source</h3>
                  </div>
                  <small style={{ color: "var(--text-3)" }}>Linked story: <strong>{requirementId}</strong></small>
                </div>

                <textarea
                  rows={8}
                  value={gitDiff}
                  onChange={(e) => setGitDiff(e.target.value)}
                  placeholder="Paste git diff here (e.g. diff --git a/src/controllers/...)"
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "var(--surface-2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#A7F3D0",
                    fontFamily: "monospace",
                    fontSize: "12.5px",
                    lineHeight: 1.5,
                    resize: "vertical",
                    outline: "none",
                    marginBottom: "10px",
                  }}
                />

                {reviewError && (
                  <div style={{ display: "flex", gap: "10px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#FCA5A5", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "10px" }}>
                    <AlertCircle size={16} />
                    <span>{reviewError}</span>
                  </div>
                )}

                <button
                  onClick={handleReview}
                  disabled={isReviewing || !gitDiff.trim()}
                  className="primary-btn"
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", fontSize: "14px" }}
                >
                  <Sparkles size={16} />
                  {isReviewing ? "Senior Agent Reviewing Diff..." : "Run AI Pre-Review on Diff"}
                </button>
              </div>

              {/* Review Report Display */}
              <div className="card" style={{ padding: "24px", border: "1px solid rgba(34, 197, 94, 0.25)", background: "var(--surface)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldCheck size={18} color="#22C55E" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Senior Staff Review Report</h3>
                  </div>
                  <span style={{ fontSize: "11px", background: reviewResult ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)", color: reviewResult ? "#22C55E" : "var(--text-3)", padding: "3px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    {reviewResult ? "Report Active" : "Waiting for diff"}
                  </span>
                </div>

                {isReviewing ? (
                  <Loader text="Senior Pre-Review agent checking security contracts and regression risks..." />
                ) : reviewResult ? (
                  <MarkdownView content={reviewResult} />
                ) : (
                  <div>
                    <p style={{ color: "var(--text-3)", lineHeight: 1.6, margin: "0 0 10px" }}>
                      Review report includes:
                    </p>
                    <div style={{ paddingLeft: "14px", color: "var(--text-2)", fontSize: "13.5px", lineHeight: 1.8 }}>
                      <p>? <strong>Code Standards check</strong>: lint findings, conventions, async structures.</p>
                      <p>? <strong>Regression Risk check</strong>: upstream caller integrations, backward compatibility.</p>
                      <p>? <strong>Test Coverage Gaps</strong>: uncovered code paths, boundary checks.</p>
                      <p>? <strong>Auto-PR Draft</strong>: structured summary ready for GitHub checkout mapping.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------------
              TAB 6: PR GENERATOR
              -------------------------------------------------------------------------- */}
          {activeTab === "pr" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h2 style={{ color: "var(--text)", fontSize: "20px", fontWeight: "600", margin: 0 }}>AI Pull Request Draft</h2>
                <p style={{ color: "var(--text-3)", fontSize: "13px", margin: "4px 0 0" }}>Generated from requirement scope, files touched registry, and AI code review validations.</p>
              </div>

              {/* Pipeline progress */}
              <div className="card" style={{ padding: "16px 20px" }}>
                <PipelineStatus workflow={workflow} />
              </div>

              {/* Title Section */}
              <div className="card" style={{ padding: "20px" }}>
                <label style={{ ...LABEL_STYLE, fontSize: "13.5px", color: "var(--text-3)" }}>PR Title Draft</label>
                <input
                  type="text"
                  readOnly
                  value={reviewData?.prDraft?.title || `[${requirementId || "JIRA-241"}] AI Pre-Review: Multi-Factor Authentication & Order Rate Limit`}
                  style={{ ...INPUT_STYLE, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>

              {/* Markdown Description */}
              <div className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <label style={{ ...LABEL_STYLE, fontSize: "13.5px", color: "var(--text-3)", margin: 0 }}>PR Description Template (Markdown)</label>
                  {reviewResult && (
                    <span style={{ fontSize: "11px", color: "var(--nvidia)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Sparkles size={12} /> Auto-synthesized from Gemini Pre-Review
                    </span>
                  )}
                </div>
                <textarea
                  rows={12}
                  readOnly
                  value={
                    reviewResult
                      ? `## Automated AI Pre-Review Summary (${requirementId})\n\n${reviewResult}\n\n---\n*Generated by CodeScope Multi-Agent Platform*`
                      : `## Summary\n� Implemented 2FA TOTP verification on checkout for high-value orders (> $500).\n� Enforced 40% maximum discount threshold in discountService.\n� Updated Order schema to store \`requires2FA\` boolean status.\n� Added test coverage in \`tests/checkout.test.js\`.\n\n## Linked Requirement\n${requirementId || "JIRA-241"}\n\n## Files Touched\n� src/controllers/checkoutController.js\n� src/services/discountService.js\n� src/models/Order.js\n� tests/checkout.test.js\n\n## Pre-Review Checklist\n? Unit tests updated\n? Code quality & linting passed\n? Backward compatibility preserved`
                  }
                  style={{ ...INPUT_STYLE, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", height: "300px", resize: "none", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.6 }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button onClick={handleCopyPR} className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", fontSize: "13.5px" }}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied description!" : "Copy Description"}
                </button>
                <button onClick={handleExportPR} className="secondary-btn" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px" }}>
                  <Download size={16} /> Export Markdown File
                </button>
                <button onClick={handleSubmitPR} className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "8px", background: "#059669", padding: "10px 18px", fontSize: "13.5px" }}>
                  {submitted ? <Check size={16} /> : <Send size={16} />}
                  {submitted ? "PR Synced to GitHub!" : "Publish to GitHub PR"}
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------------
              TAB 7: AI AGENT NETWORK
              -------------------------------------------------------------------------- */}
          {activeTab === "agents" && (
            <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr", gap: "25px" }}>
              {/* Agent Grid */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "center", padding: "0 0 8px" }}>
                  <IntelligenceCore size={320} />
                </div>
                <div>
                  <h2 style={{ color: "var(--text)", fontSize: "20px", fontWeight: "600", margin: 0 }}>Active Agent Network</h2>
                  <p style={{ color: "var(--text-3)", fontSize: "13px", margin: "4px 0 0" }}>Check health telemetry and metrics of each isolated agent inside the intelligence swarm.</p>
                </div>
                {AGENTS_LIST.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    name={agent.name}
                    role={agent.role}
                    model={agent.model}
                    state={
                      agent.id === 'coord-agent' ? (workflow?.coordinator || 'Waiting') :
                      agent.id === 'req-agent' ? (workflow?.requirement || 'Waiting') :
                      agent.id === 'impact-agent' ? (workflow?.impact || 'Waiting') :
                      agent.id === 'review-agent' ? (workflow?.review || 'Waiting') :
                      agent.id === 'pr-agent' ? (workflow?.pr || 'Waiting') : 'Waiting'
                    }
                    tasksCompleted={agent.tasksCompleted}
                    accuracy={agent.accuracy}
                  />
                ))}
              </div>

              {/* Status bar */}
              <div>
                <AIStatus />
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------------
              TAB 8: INSIGHTS & ANALYTICS
              -------------------------------------------------------------------------- */}
          {activeTab === "analytics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
              <div>
                <h2 style={{ color: "var(--text)", fontSize: "20px", fontWeight: "600", margin: 0 }}>Quality & Health Insights</h2>
                <p style={{ color: "var(--text-3)", fontSize: "13px", margin: "4px 0 0" }}>Telemetry trends showing code hot spots, defect prevention rates, and safety scopes.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {/* Hotspots Card */}
                <div className="card" style={{ padding: "24px" }}>
                  <h3 style={{ fontSize: "15.5px", fontWeight: 600, margin: "0 0 4px" }}>?? Most Impacted Source Hotspots</h3>
                  <p style={{ color: "var(--text-3)", fontSize: "12.5px", margin: "0 0 16px" }}>Code paths that get touched frequently by requirement changes.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[
                      { file: "src/controllers/authController.js", count: 42, risk: "High" },
                      { file: "src/services/discountService.js", count: 31, risk: "High" },
                      { file: "src/models/Order.js", count: 28, risk: "Medium" },
                      { file: "src/middlewares/auth.js", count: 19, risk: "Low" },
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                        <code style={{ fontSize: "12px", color: "var(--text)" }}>{item.file}</code>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{item.count} updates</span>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: item.risk === "High" ? "#EF4444" : item.risk === "Medium" ? "#F59E0B" : "#22C55E" }}>
                            {item.risk} Risk
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reliability metrics */}
                <div className="card" style={{ padding: "24px" }}>
                  <h3 style={{ fontSize: "15.5px", fontWeight: 600, margin: "0 0 4px" }}>??? Swarm Verification Metrics</h3>
                  <p style={{ color: "var(--text-3)", fontSize: "12.5px", margin: "0 0 18px" }}>Aggregated health status scores for scanned packages.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {[
                      { label: "Unit Test Coverage", value: 91, color: "#38BDF8" },
                      { label: "AI Review Agreement", value: 96, color: "var(--nvidia)" },
                      { label: "Linting & Best Practice Standards", value: 98, color: "#22C55E" },
                      { label: "Security Risk Clearance", value: 89, color: "#F59E0B" },
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "13px" }}>
                          <span style={{ color: "var(--text-2)" }}>{item.label}</span>
                          <span style={{ fontWeight: 600, color: item.color }}>{item.value}%</span>
                        </div>
                        <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${item.value}%`, height: "100%", background: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------------
              TAB 9: CONFIGURATION & SETTINGS
              -------------------------------------------------------------------------- */}
          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
              <div>
                <h2 style={{ color: "var(--text)", fontSize: "20px", fontWeight: "600", margin: 0 }}>Workspace Configuration</h2>
                <p style={{ color: "var(--text-3)", fontSize: "13px", margin: "4px 0 0" }}>Set model weights, link developer accounts, and review database statuses.</p>
              </div>

              <form onSubmit={handleSaveSettings} style={{ maxWidth: "800px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* AI config */}
                <div className="card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <Key size={18} color="var(--nvidia)" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>AI Provider</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--nvidia)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                      NVIDIA NIM � Active Provider
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                      Model: {import.meta.env.VITE_NVIDIA_MODEL ?? 'nvidia/llama-3.1-nemotron-70b-instruct'}
                    </div>
                  </div>
                </div>

                {/* Username Integrations */}
                <div className="card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <GitBranch size={18} color="#F59E0B" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Integration Username Mapping</h3>
                  </div>
                  <p style={{ color: "var(--text-3)", fontSize: "12.5px", margin: "0 0 16px" }}>
                    Map webhook signals (GitHub pusher, Jira assignee) to route reports to your address.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                      <label style={LABEL_STYLE}>GitHub Username</label>
                      <input
                        type="text"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="e.g. john-doe"
                        style={INPUT_STYLE}
                      />
                      <p style={HINT_STYLE}>Matches GitHub commit author signals.</p>
                    </div>

                    <div>
                      <label style={LABEL_STYLE}>Jira Username</label>
                      <input
                        type="text"
                        value={jiraUsername}
                        onChange={(e) => setJiraUsername(e.target.value)}
                        placeholder="e.g. john.doe"
                        style={INPUT_STYLE}
                      />
                      <p style={HINT_STYLE}>Matches Jira ticket asignee identifiers.</p>
                    </div>
                  </div>
                </div>

                {/* Database indicator */}
                <div className="card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <Database size={18} color="#22C55E" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>System Services Health</h3>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", padding: "10px 14px", borderRadius: "10px", color: "#86EFAC", fontSize: "13px" }}>
                    <span>? MongoDB Connection Status</span>
                    <strong>Active (Safe Mode fallback enabled)</strong>
                  </div>
                </div>

                {/* Save status */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button type="submit" disabled={settingsSaving} className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px", fontSize: "13.5px" }}>
                    <Save size={15} /> Save Configurations
                  </button>
                  {settingsSaved && <span style={{ color: "#22C55E", fontSize: "13px" }}>? Settings updated successfully.</span>}
                  {settingsError && <span style={{ color: "#EF4444", fontSize: "13px" }}>{settingsError}</span>}
                </div>
              </form>
            </div>
          )}

      {/* Add New File Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(2,6,23,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "700px", padding: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "14px", color: "var(--text)" }}>Index New Source File</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={18} /></button>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: "10px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-3)" }}>Load directly from your local computer:</span>
              <label className="secondary-btn" style={{ fontSize: "12px", padding: "6px 12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", margin: 0 }}>
                <Upload size={13} /> Select Local File
                <input type="file" onChange={handleSingleLocalFileSelect} style={{ display: "none" }} />
              </label>
            </div>

            <form onSubmit={handleSaveNewFile} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={LABEL_STYLE}>Relative File Path</label>
                <input
                  type="text"
                  value={filePathInput}
                  onChange={(e) => setFilePathInput(e.target.value)}
                  placeholder="e.g. src/controllers/orderController.js"
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Module Classification</label>
                <select value={moduleInput} onChange={(e) => setModuleInput(e.target.value)} style={INPUT_STYLE}>
                  <option value="Controllers">Controllers</option>
                  <option value="Services">Services</option>
                  <option value="Models">Models</option>
                  <option value="Middlewares">Middlewares</option>
                  <option value="Routes">Routes</option>
                  <option value="Tests">Tests</option>
                  <option value="Utils">Utils</option>
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Code Content</label>
                <textarea
                  rows={8}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Paste source code logic block here..."
                  style={{ ...INPUT_STYLE, fontFamily: "monospace", resize: "none", height: "180px" }}
                />
              </div>

              {fileFormError && (
                <div style={{ color: "#EF4444", fontSize: "12.5px" }}>{fileFormError}</div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="secondary-btn" style={{ fontSize: "13px", padding: "8px 14px" }}>Cancel</button>
                <button type="submit" disabled={isSubmittingFile} className="primary-btn" style={{ fontSize: "13px", padding: "8px 16px" }}>
                  {isSubmittingFile ? "Indexing..." : "Index File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Upload Modal */}
      {showBatchModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(2,6,23,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "750px", padding: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "14px", color: "var(--text)" }}>Batch Index Files</h3>
              <button onClick={() => setShowBatchModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <p style={{ color: "var(--text-3)", fontSize: "13px", margin: 0 }}>
              Paste files separated by <code>--- path/to/file ---</code> separators to index multiple files simultaneously.
            </p>

            <textarea
              rows={8}
              value={batchRawText}
              onChange={(e) => setBatchRawText(e.target.value)}
              placeholder={`--- src/controllers/userController.js ---\nconst login = ...\n\n--- src/models/User.js ---\nconst UserSchema = ...`}
              style={{ ...INPUT_STYLE, fontFamily: "monospace", height: "180px", resize: "none" }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleParseBatchText} className="secondary-btn" style={{ fontSize: "13px" }}>Parse & Preview</button>
              {batchFilesPreview.length > 0 && (
                <span style={{ alignSelf: "center", color: "#22C55E", fontSize: "13px" }}>
                  ? Decoded {batchFilesPreview.length} files successfully.
                </span>
              )}
            </div>

            {batchFilesPreview.length > 0 && (
              <div style={{ maxHeight: "100px", overflow: "auto", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px 12px" }}>
                {batchFilesPreview.map((item, idx) => (
                  <div key={idx} style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-2)", display: "flex", justifyContent: "space-between" }}>
                    <span>{item.filePath}</span>
                    <span style={{ color: "var(--text-3)" }}>({item.lineCount} lines)</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => { setShowBatchModal(false); setBatchFilesPreview([]); }} className="secondary-btn" style={{ fontSize: "13px", padding: "8px 14px" }}>Cancel</button>
              <button onClick={handleConfirmBatchUpload} disabled={isSubmittingFile || batchFilesPreview.length === 0} className="primary-btn" style={{ fontSize: "13px", padding: "8px 16px" }}>
                {isSubmittingFile ? "Uploading..." : "Confirm Indexing"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>{/* end .workspace-hub */}
    </>
  );
};

export default WorkspaceHub;




