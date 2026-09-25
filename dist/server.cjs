var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_fs = __toESM(require("fs"), 1);
var XLSX = __toESM(require("xlsx"), 1);
var import_vite = require("vite");
var lookupTokensMap = /* @__PURE__ */ new Map();
var studentToTokenMap = /* @__PURE__ */ new Map();
var upgradeProposalsMap = /* @__PURE__ */ new Map();
var LOOKUP_DATA_DIR = import_path.default.join(process.cwd(), "data");
var LOOKUP_DATA_FILE = import_path.default.join(LOOKUP_DATA_DIR, "lookup_records.json");
function indexLookupRecord(record, customToken) {
  if (!record || !record.student) return;
  const s = record.student;
  if (customToken) {
    lookupTokensMap.set(customToken, record);
    if (s.id) {
      studentToTokenMap.set(s.id, customToken);
    }
  }
  if (s.id) {
    lookupTokensMap.set(s.id, record);
  }
  if (s.studentCode) {
    const rawCode = String(s.studentCode).trim();
    lookupTokensMap.set(rawCode, record);
    const cleanCode = rawCode.replace(/^[#№\s]+/, "");
    if (cleanCode) {
      lookupTokensMap.set(cleanCode, record);
    }
    const cleanDigits = rawCode.replace(/\D/g, "");
    if (cleanDigits) {
      lookupTokensMap.set(cleanDigits, record);
      lookupTokensMap.set(cleanDigits.padStart(4, "0"), record);
      const parsedNum = parseInt(cleanDigits, 10);
      if (!isNaN(parsedNum)) {
        lookupTokensMap.set(String(parsedNum), record);
      }
    }
  }
  if (s.lookup_code) {
    lookupTokensMap.set(s.lookup_code, record);
  }
}
function loadPersistedLookupData() {
  try {
    if (import_fs.default.existsSync(LOOKUP_DATA_FILE)) {
      const content = import_fs.default.readFileSync(LOOKUP_DATA_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.student) {
            indexLookupRecord(item);
          }
        }
        console.log(`[Persistence] Loaded ${parsed.length} lookup records from ${LOOKUP_DATA_FILE}`);
      }
    }
  } catch (err) {
    console.warn("[Persistence] Could not load lookup records:", err);
  }
}
function savePersistedLookupData() {
  try {
    if (!import_fs.default.existsSync(LOOKUP_DATA_DIR)) {
      import_fs.default.mkdirSync(LOOKUP_DATA_DIR, { recursive: true });
    }
    const uniqueRecords = [];
    const seenStudentIds = /* @__PURE__ */ new Set();
    for (const record of lookupTokensMap.values()) {
      if (record && record.student && record.student.id && !seenStudentIds.has(record.student.id)) {
        seenStudentIds.add(record.student.id);
        uniqueRecords.push(record);
      }
    }
    import_fs.default.writeFileSync(LOOKUP_DATA_FILE, JSON.stringify(uniqueRecords, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Persistence] Could not save lookup records:", err);
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  loadPersistedLookupData();
  app.use(import_express.default.json({ limit: "10mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  const handleSubscriptionStatus = async (req, res) => {
    const authHeader = req.headers.authorization;
    const orgId = req.query.orgId;
    if (orgId) {
      const localProposal = upgradeProposalsMap.get(orgId);
      if (localProposal && localProposal.status === "approved") {
        return res.status(200).json({
          plan: localProposal.requestedPlan,
          status: "active",
          trial_ends_at: null,
          days_remaining: 0,
          limits: {
            max_branches: 10,
            max_students: 5e3,
            inventory_sales: true,
            combined_packages: true,
            advanced_analytics: true,
            api_access: true
          }
        });
      }
    }
    try {
      const targetUrl = `https://masar-api.weroperking.workers.dev/api/me/subscription-status${orgId ? `?orgId=${orgId}` : ""}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6e3);
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "Authorization": authHeader || ""
        }
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        console.log(`[Subscription Proxy] Upstream OK for org ${orgId}:`, JSON.stringify(data));
        return res.status(200).json(data);
      } else if (response.status === 402) {
        const errData = await response.json().catch(() => ({}));
        console.log(`[Subscription Proxy] Upstream 402 for org ${orgId}:`, JSON.stringify(errData));
        return res.status(402).json(errData);
      }
      console.warn(`[Subscription Proxy] Upstream returned status ${response.status} for org ${orgId}`);
      return res.status(404).json({ error: "Not found" });
    } catch (error) {
      console.warn("[Proxy Warning] Fetch subscription status timed out or failed:", error);
      return res.status(404).json({ error: "Upstream unavailable" });
    }
  };
  app.get("/api/me/subscription-status", handleSubscriptionStatus);
  app.get("/me/subscription-status", handleSubscriptionStatus);
  const handleProposalStatus = async (req, res) => {
    const orgId = req.params.id;
    const authHeader = req.headers.authorization;
    const localProposal = upgradeProposalsMap.get(orgId);
    if (localProposal && localProposal.status === "pending") {
      return res.status(200).json({
        status: localProposal.status,
        requested_plan: localProposal.requestedPlan,
        requestedPlan: localProposal.requestedPlan,
        created_at: localProposal.createdAt
      });
    }
    try {
      const targetUrl = `https://masar-api.weroperking.workers.dev/api/orgs/${orgId}/upgrade-proposal/status`;
      console.log(`[Proxy] GET status from upstream: ${targetUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "Authorization": authHeader || ""
        }
      });
      clearTimeout(timeoutId);
      const responseText = await response.text();
      console.log(`[Proxy] Upstream status response (${response.status}):`, responseText);
      if (response.status === 402 || !response.ok) {
        return res.status(200).json({ status: localProposal?.status || "none", plan: "none" });
      }
      try {
        const data = JSON.parse(responseText);
        if (data.status === "pending" || data.status === "approved") {
          upgradeProposalsMap.set(orgId, {
            orgId,
            requestedPlan: data.requested_plan || data.requestedPlan || "pro",
            status: data.status,
            createdAt: data.created_at || (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        return res.status(200).json(data);
      } catch {
        return res.status(200).json({ status: localProposal?.status || "none" });
      }
    } catch (error) {
      console.warn("[Proxy Warning] Fetch proposal status timed out or failed:", error);
      return res.status(200).json({ status: localProposal?.status || "none", plan: "none" });
    }
  };
  app.get("/api/orgs/:id/upgrade-proposal/status", handleProposalStatus);
  app.get("/orgs/:id/upgrade-proposal/status", handleProposalStatus);
  const handleProposalSubmit = async (req, res) => {
    const orgId = req.params.id;
    const authHeader = req.headers.authorization;
    const requestedPlan = req.body.requested_plan || req.body.requestedPlan || "pro";
    const proposalRecord = {
      orgId,
      requestedPlan,
      status: "pending",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    upgradeProposalsMap.set(orgId, proposalRecord);
    console.log(`[Proxy] Recorded upgrade proposal in memory for org ${orgId} to plan ${requestedPlan}`);
    try {
      const targetUrl = `https://masar-api.weroperking.workers.dev/api/orgs/${orgId}/upgrade-proposal`;
      console.log(`[Proxy] POST proposal to upstream: ${targetUrl}`);
      const payload = {
        ...req.body,
        requestedPlan,
        requested_plan: requestedPlan
      };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader || ""
        },
        body: JSON.stringify(payload)
      });
      clearTimeout(timeoutId);
      const responseText = await response.text();
      console.log(`[Proxy] Upstream submit response (${response.status}):`, responseText);
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          return res.status(200).json(data);
        } catch {
          return res.status(200).json({
            success: true,
            status: "pending",
            requested_plan: requestedPlan,
            requestedPlan
          });
        }
      }
      return res.status(200).json({
        success: true,
        status: "pending",
        requested_plan: requestedPlan,
        requestedPlan,
        message: "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0648\u062A\u0633\u062C\u064A\u0644 \u0637\u0644\u0628 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (error) {
      console.warn("[Proxy Warning] Upstream submit timed out or failed, but proposal is saved locally:", error);
      return res.status(200).json({
        success: true,
        status: "pending",
        requested_plan: requestedPlan,
        requestedPlan,
        message: "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0648\u062A\u0633\u062C\u064A\u0644 \u0637\u0644\u0628 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0628\u0646\u062C\u0627\u062D"
      });
    }
  };
  app.post("/api/orgs/:id/upgrade-proposal", handleProposalSubmit);
  app.post("/orgs/:id/upgrade-proposal", handleProposalSubmit);
  const handlePublicLookup = (req, res) => {
    const rawToken = String(req.params.token || "").trim();
    if (!rawToken) {
      return res.status(404).json({ error: "Invalid token" });
    }
    if (lookupTokensMap.size === 0) {
      loadPersistedLookupData();
    }
    const decodedToken = decodeURIComponent(rawToken).trim();
    const cleanTokenDigits = decodedToken.replace(/\D/g, "");
    const numToken = cleanTokenDigits ? parseInt(cleanTokenDigits, 10) : null;
    const strippedPrefix = decodedToken.replace(/^[#№s_STst-]+\s*/i, "").trim();
    let data = lookupTokensMap.get(rawToken) || lookupTokensMap.get(decodedToken) || (strippedPrefix ? lookupTokensMap.get(strippedPrefix) : void 0) || (cleanTokenDigits ? lookupTokensMap.get(cleanTokenDigits) : void 0) || (cleanTokenDigits ? lookupTokensMap.get(cleanTokenDigits.padStart(4, "0")) : void 0) || (numToken !== null ? lookupTokensMap.get(String(numToken)) : void 0);
    if (!data) {
      const mappedToken = studentToTokenMap.get(rawToken) || studentToTokenMap.get(decodedToken) || (strippedPrefix ? studentToTokenMap.get(strippedPrefix) : void 0);
      if (mappedToken) {
        data = lookupTokensMap.get(mappedToken);
      }
    }
    if (!data) {
      for (const val of lookupTokensMap.values()) {
        const student = val.student;
        if (!student) continue;
        const sDigits = student.studentCode ? student.studentCode.replace(/\D/g, "") : "";
        const sNum = sDigits ? parseInt(sDigits, 10) : null;
        const sCleanCode = student.studentCode ? student.studentCode.replace(/^[#№\s]+/, "").trim() : "";
        if (student.id === rawToken || student.id === decodedToken || student.studentCode === rawToken || student.studentCode === decodedToken || sCleanCode && (sCleanCode === rawToken || sCleanCode === decodedToken || sCleanCode === strippedPrefix) || cleanTokenDigits.length > 0 && sDigits === cleanTokenDigits || numToken !== null && sNum !== null && !isNaN(numToken) && !isNaN(sNum) && numToken === sNum || student.phone && cleanTokenDigits.length >= 8 && student.phone.replace(/\D/g, "").endsWith(cleanTokenDigits) || student.parentPhone && cleanTokenDigits.length >= 8 && student.parentPhone.replace(/\D/g, "").endsWith(cleanTokenDigits)) {
          data = val;
          break;
        }
      }
    }
    if (!data) {
      return res.status(404).json({ error: "\u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0644\u0645 \u064A\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0627\u0644\u0628 \u0628\u0639\u062F" });
    }
    const enrichedData = {
      ...data,
      teacherName: data.teacherName || "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A",
      academyName: data.academyName || data.centerName || "\u0633\u0646\u062A\u0631 \u0645\u0633\u0627\u0631 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A",
      centerName: data.centerName || data.academyName || "\u0633\u0646\u062A\u0631 \u0645\u0633\u0627\u0631 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A",
      branch: data.branch || data.student?.branch || "\u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0631\u0626\u064A\u0633\u064A",
      student: {
        ...data.student,
        school: data.student?.school || "\u0645\u062F\u0631\u0633\u0629 \u0639\u0627\u0645\u0629",
        gradeLevel: data.student?.gradeLevel || "\u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0629",
        branch: data.student?.branch || data.branch || "\u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0631\u0626\u064A\u0633\u064A"
      }
    };
    return res.status(200).json(enrichedData);
  };
  app.get("/api/public/lookup/:token", handlePublicLookup);
  app.get("/public/lookup/:token", handlePublicLookup);
  const handleSyncLookups = (req, res) => {
    const items = Array.isArray(req.body) ? req.body : req.body?.items || [];
    let count = 0;
    for (const item of items) {
      if (item && item.student && item.student.id) {
        indexLookupRecord(item);
        count++;
      }
    }
    if (count > 0) {
      savePersistedLookupData();
    }
    console.log(`[API] Synced and persisted ${count} lookup snapshots to server.`);
    res.status(200).json({ success: true, count });
  };
  app.post("/api/public/sync-lookups", handleSyncLookups);
  app.post("/public/sync-lookups", handleSyncLookups);
  const handleGetStudent = (req, res) => {
    const { id } = req.params;
    const token = studentToTokenMap.get(id) || null;
    const lookupData = token ? lookupTokensMap.get(token) : null;
    res.status(200).json({
      id,
      public_lookup_token: token,
      lookup_code: lookupData?.student?.lookup_code || null,
      lookup_data: lookupData
    });
  };
  app.get("/api/students/:id", handleGetStudent);
  app.get("/students/:id", handleGetStudent);
  const handleUpdateLookupData = (req, res) => {
    const { id } = req.params;
    const token = studentToTokenMap.get(id);
    if (!token) {
      return res.status(404).json({ error: "No active token for student" });
    }
    const existing = lookupTokensMap.get(token);
    if (existing) {
      if (req.body.student) existing.student = { ...existing.student, ...req.body.student };
      if (req.body.attendance) existing.attendance = { ...existing.attendance, ...req.body.attendance };
      if (req.body.exams) existing.exams = req.body.exams;
      if (req.body.subscription) existing.subscription = { ...existing.subscription, ...req.body.subscription };
      if (req.body.teacherName) existing.teacherName = req.body.teacherName;
      if (req.body.academyName) existing.academyName = req.body.academyName;
      if (req.body.centerName) existing.centerName = req.body.centerName;
      if (req.body.branch) existing.branch = req.body.branch;
      indexLookupRecord(existing, token);
      savePersistedLookupData();
    }
    res.status(200).json({ success: true, token });
  };
  app.put("/api/students/:id/lookup-data", handleUpdateLookupData);
  app.put("/students/:id/lookup-data", handleUpdateLookupData);
  app.post("/api/sync/handshake", async (req, res) => {
    try {
      const { devicePublicKey } = req.body || {};
      console.log("[API] Received handshake request with devicePublicKey:", devicePublicKey ? "present" : "none");
      if (devicePublicKey) {
        try {
          const binaryDer = Buffer.from(devicePublicKey, "base64");
          const importedPub = await import_crypto.default.webcrypto.subtle.importKey(
            "spki",
            binaryDer,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["wrapKey"]
          );
          const rawDek = await import_crypto.default.webcrypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
          );
          const wrapped = await import_crypto.default.webcrypto.subtle.wrapKey(
            "raw",
            rawDek,
            importedPub,
            { name: "RSA-OAEP" }
          );
          const wrappedBase64 = Buffer.from(wrapped).toString("base64");
          const pubKeyHash = import_crypto.default.createHash("sha256").update(devicePublicKey).digest("hex");
          return res.status(200).json({
            wrappedDek: wrappedBase64,
            publicKeyHash: pubKeyHash
          });
        } catch (subtleErr) {
          console.warn("[API] Handshake crypto wrap error, returning fallback:", subtleErr);
        }
      }
      return res.status(200).json({
        wrappedDek: "mock_wrapped_dek_base64",
        publicKeyHash: "mock_pubkey_hash"
      });
    } catch (e) {
      console.error("[API] Handshake failed:", e);
      res.status(500).json({ error: "Handshake failed" });
    }
  });
  app.post("/api/cards/upload-print-order", (req, res) => {
    try {
      const { frontImage, backImage, orderDetails = {} } = req.body || {};
      const orderId = `card_print_${Date.now()}_${import_crypto.default.randomBytes(3).toString("hex")}`;
      const baseDir = import_path.default.join(process.cwd(), "public", "orders");
      const orderDir = import_path.default.join(baseDir, orderId);
      import_fs.default.mkdirSync(orderDir, { recursive: true });
      let frontImageUrl = null;
      let backImageUrl = null;
      if (frontImage && frontImage.includes("base64,")) {
        const base64Content = frontImage.split(";base64,").pop();
        if (base64Content) {
          import_fs.default.writeFileSync(import_path.default.join(orderDir, "front_design.png"), base64Content, "base64");
          frontImageUrl = `/orders/${orderId}/front_design.png`;
        }
      }
      if (backImage && backImage.includes("base64,")) {
        const base64Content = backImage.split(";base64,").pop();
        if (base64Content) {
          import_fs.default.writeFileSync(import_path.default.join(orderDir, "back_design.png"), base64Content, "base64");
          backImageUrl = `/orders/${orderId}/back_design.png`;
        }
      }
      import_fs.default.writeFileSync(import_path.default.join(orderDir, "order_info.json"), JSON.stringify({
        orderId,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        targetPhone: "01277707096",
        ...orderDetails
      }, null, 2));
      console.log(`[API] Successfully prepared and saved card order ${orderId} for phone 01277707096`);
      res.status(200).json({
        success: true,
        orderId,
        frontImageUrl,
        backImageUrl,
        targetPhone: "01277707096",
        message: "\u062A\u0645 \u0631\u0641\u0639 \u0648\u062D\u0641\u0638 \u0635\u0648\u0631 \u0627\u0644\u062A\u0635\u0645\u064A\u0645 \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (err) {
      console.error("[API Error] Upload print order failed:", err);
      res.status(500).json({
        error: "\u0641\u0634\u0644 \u0631\u0641\u0639 \u0635\u0648\u0631 \u0627\u0644\u062A\u0635\u0645\u064A\u0645",
        details: err.message || err.toString()
      });
    }
  });
  app.post("/api/cards/order-physical", (req, res) => {
    try {
      const { cardImage, students = [], academyName = "\u0633\u0646\u062A\u0631 \u0645\u0633\u0627\u0631", contactEmail = "", contactPhone = "" } = req.body || {};
      console.log(`[API] Received physical cards printing request for academy: "${academyName}". Student count: ${students.length}`);
      const excelRows = students.map((s, index) => ({
        "\u0645": index + 1,
        "\u0643\u0648\u062F \u0627\u0644\u0637\u0627\u0644\u0628": s.studentCode || "",
        "\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628": s.name || "",
        "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641": s.phone || "",
        "\u0627\u0644\u0635\u0641 \u0627\u0644\u062F\u0631\u0627\u0633\u064A": s.gradeLevel || "",
        "\u0627\u0644\u0645\u062F\u0631\u0633\u0629": s.school || "",
        "\u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631": s.parentName || "",
        "\u0647\u0627\u062A\u0641 \u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631": s.parentPhone || "",
        "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0633\u062C\u064A\u0644": s.created_at ? new Date(s.created_at).toLocaleDateString("ar-EG") : ""
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelRows, {
        header: ["\u0645", "\u0643\u0648\u062F \u0627\u0644\u0637\u0627\u0644\u0628", "\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628", "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641", "\u0627\u0644\u0635\u0641 \u0627\u0644\u062F\u0631\u0627\u0633\u064A", "\u0627\u0644\u0645\u062F\u0631\u0633\u0629", "\u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631", "\u0647\u0627\u062A\u0641 \u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631", "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0633\u062C\u064A\u0644"]
      });
      ws["!views"] = [{ RTL: true }];
      XLSX.utils.book_append_sheet(wb, ws, "\u0643\u0634\u0641 \u0643\u0631\u0648\u062A \u0627\u0644\u0637\u0644\u0627\u0628");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const orderId = `order_${Date.now()}_${import_crypto.default.randomBytes(3).toString("hex")}`;
      const baseDir = import_path.default.join(process.cwd(), "public", "orders");
      const orderDir = import_path.default.join(baseDir, orderId);
      import_fs.default.mkdirSync(orderDir, { recursive: true });
      if (cardImage && cardImage.includes("base64,")) {
        const base64Content = cardImage.split(";base64,").pop();
        if (base64Content) {
          import_fs.default.writeFileSync(import_path.default.join(orderDir, "card_design.png"), base64Content, "base64");
          console.log(`[API] Saved customized card template image to public/orders/${orderId}/card_design.png`);
        }
      }
      import_fs.default.writeFileSync(import_path.default.join(orderDir, "students_list.xlsx"), excelBuffer);
      console.log(`[API] Saved student details excel file to public/orders/${orderId}/students_list.xlsx`);
      res.status(200).json({
        success: true,
        orderId,
        message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u062A\u0635\u0645\u064A\u0645 \u0627\u0644\u0643\u0631\u0646\u064A\u0647 \u0648\u0643\u0634\u0641 \u0627\u0644\u0637\u0644\u0627\u0628 \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 \u0641\u0631\u064A\u0642 \u0645\u0637\u0628\u0639\u0629 \u0645\u0633\u0627\u0631 \u0644\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0643\u0631\u0648\u062A \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0626\u064A\u0629 \u0627\u0644\u0645\u0645\u062A\u0627\u0632\u0629!",
        excelDownloadUrl: `/orders/${orderId}/students_list.xlsx`,
        imageDownloadUrl: `/orders/${orderId}/card_design.png`
      });
    } catch (err) {
      console.error("[API Error] Card physical order failed:", err);
      res.status(500).json({
        error: "\u0639\u0630\u0631\u0627\u064B\u060C \u0641\u0634\u0644 \u062A\u062C\u0647\u064A\u0632 \u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0637\u0644\u0628 \u0648\u0625\u0631\u0633\u0627\u0644\u0647\u0627.",
        details: err.message || err.toString()
      });
    }
  });
  app.use("/orders", import_express.default.static(import_path.default.join(process.cwd(), "public", "orders")));
  app.post("/api/sync/push", (req, res) => {
    const { operations = [] } = req.body || {};
    console.log(`[API] Received push sync with ${operations.length} operations.`);
    const results = operations.map((op) => ({
      idempotencyKey: op.idempotencyKey,
      status: "success",
      serverConfirmedRecord: op.payload ? { ...op.payload, id: op.entityId } : { id: op.entityId }
    }));
    res.status(200).json({ results });
  });
  app.get("/api/sync/pull", (req, res) => {
    const since = req.query.since;
    console.log(`[API] Received pull sync request since: ${since}`);
    res.status(200).json({
      data: {},
      timestamp: Date.now()
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
