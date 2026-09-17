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
var import_vite = require("vite");
var lookupTokensMap = /* @__PURE__ */ new Map();
var studentToTokenMap = /* @__PURE__ */ new Map();
var upgradeProposalsMap = /* @__PURE__ */ new Map();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
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
    const { token } = req.params;
    if (!token) {
      return res.status(404).json({ error: "Invalid token" });
    }
    const data = lookupTokensMap.get(token);
    if (!data) {
      return res.status(404).json({ error: "This link is invalid or has expired" });
    }
    return res.status(200).json(data);
  };
  app.get("/api/public/lookup/:token", handlePublicLookup);
  app.get("/public/lookup/:token", handlePublicLookup);
  const handleGetStudent = (req, res) => {
    const { id } = req.params;
    const token = studentToTokenMap.get(id) || null;
    const lookupData = token ? lookupTokensMap.get(token) : null;
    res.status(200).json({
      id,
      public_lookup_token: token,
      lookup_data: lookupData
    });
  };
  app.get("/api/students/:id", handleGetStudent);
  app.get("/students/:id", handleGetStudent);
  const handleGenerateLookupToken = (req, res) => {
    const { id } = req.params;
    const body = req.body || {};
    const existingToken = studentToTokenMap.get(id);
    if (existingToken) {
      lookupTokensMap.delete(existingToken);
      studentToTokenMap.delete(id);
    }
    const newToken = import_crypto.default.randomUUID();
    const studentInfo = body.student || {
      id,
      name: body.name || "\u0637\u0627\u0644\u0628 \u0645\u0633\u0627\u0631",
      studentCode: body.studentCode || "",
      gradeLevel: body.gradeLevel || "",
      school: body.school || ""
    };
    const attendanceInfo = body.attendance || {
      attended: 0,
      missed: 0,
      total: 0,
      rate: 100
    };
    const examsInfo = Array.isArray(body.exams) ? body.exams : [];
    const subscriptionInfo = body.subscription || {
      status: "no_record",
      month: (/* @__PURE__ */ new Date()).getMonth() + 1,
      year: (/* @__PURE__ */ new Date()).getFullYear(),
      amountTotal: 0,
      amountPaid: 0
    };
    const record = {
      student: {
        id,
        name: studentInfo.name,
        studentCode: studentInfo.studentCode,
        gradeLevel: studentInfo.gradeLevel,
        school: studentInfo.school
      },
      attendance: attendanceInfo,
      exams: examsInfo,
      subscription: subscriptionInfo
    };
    lookupTokensMap.set(newToken, record);
    studentToTokenMap.set(id, newToken);
    console.log(`[API] Generated new public lookup token for student ${id} (${studentInfo.name}): ${newToken}`);
    res.status(200).json({
      success: true,
      token: newToken,
      public_lookup_token: newToken,
      url: `/s/${newToken}`
    });
  };
  app.post("/api/students/:id/lookup-token", handleGenerateLookupToken);
  app.post("/students/:id/lookup-token", handleGenerateLookupToken);
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
      lookupTokensMap.set(token, existing);
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
          return res.status(200).json({ wrappedDek: wrappedBase64 });
        } catch (subtleErr) {
          console.warn("[API] Handshake crypto wrap error, returning fallback:", subtleErr);
        }
      }
      return res.status(200).json({ wrappedDek: "mock_wrapped_dek_base64" });
    } catch (e) {
      console.error("[API] Handshake failed:", e);
      res.status(500).json({ error: "Handshake failed" });
    }
  });
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
