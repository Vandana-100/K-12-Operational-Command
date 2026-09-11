const express = require("express");
const db = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();

// POST /api/scenarios/simulate
// What-If Scenario sandbox computation
router.post("/scenarios/simulate", authenticateToken, (req, res) => {
  try {
    const {
      scenarioName = "Custom What-If Scenario",
      enrolmentSurgePct = 0, // e.g. +15%
      teacherAbsenteeismPct = 0, // e.g. +20%
      interventionBudgetShiftPct = 0 // e.g. +25%
    } = req.body;

    // Baseline stats
    const baseline = {
      averageClassSize: 28.5,
      teacherWeeklyHours: 33.2,
      slaBreachProbabilityPct: 14.0,
      operationalRiskScore: 35,
      overloadedTeachersCount: 2,
      estimatedMonthlyOvertimeCost: 4800
    };

    // Calculate simulated impact
    const classSizeMultiplier = 1 + (enrolmentSurgePct / 100);
    const teacherAvailabilityMultiplier = 1 - (teacherAbsenteeismPct / 100);
    const supportMultiplier = 1 + (interventionBudgetShiftPct / 100);

    const simulatedClassSize = Number((baseline.averageClassSize * classSizeMultiplier).toFixed(1));
    
    // Teacher hours increase if enrolment surges or teachers are absent
    const workloadIncrease = (enrolmentSurgePct * 0.25) + (teacherAbsenteeismPct * 0.45);
    const simulatedTeacherHours = Number((baseline.teacherWeeklyHours + workloadIncrease).toFixed(1));

    // Overtime cost calculation
    const extraHours = Math.max(0, simulatedTeacherHours - 35);
    const simulatedOvertimeCost = Math.round(baseline.estimatedMonthlyOvertimeCost + (extraHours * 2400));

    // Risk score calculation
    let simulatedRiskScore = baseline.operationalRiskScore + Math.round(enrolmentSurgePct * 1.5) + Math.round(teacherAbsenteeismPct * 2.0) - Math.round(interventionBudgetShiftPct * 0.8);
    simulatedRiskScore = Math.max(10, Math.min(98, simulatedRiskScore));

    const simulatedSlaBreachProb = Number(Math.min(95, Math.max(5, baseline.slaBreachProbabilityPct + (teacherAbsenteeismPct * 1.8) + (enrolmentSurgePct * 0.9) - (interventionBudgetShiftPct * 0.6))).toFixed(1));

    const simulatedOverloadedTeachers = Math.min(10, Math.round(baseline.overloadedTeachersCount + (workloadIncrease > 3 ? 4 : workloadIncrease > 1 ? 2 : 0)));

    // Generate actionable mitigation advice
    const mitigationAdvice = [];
    if (simulatedTeacherHours > 35) {
      mitigationAdvice.push(`Authorize ${Math.round(extraHours * 8)} temporary adjunct hours to keep full-time staff under 35h ceiling.`);
    }
    if (simulatedClassSize > 32) {
      mitigationAdvice.push("Split Grade 10 & 11 core sections into modular lab groups to respect physical classroom limits.");
    }
    if (simulatedSlaBreachProb > 25) {
      mitigationAdvice.push("Pre-assign tier-1 parent communication tickets to automated acknowledgement bot with 12h resolution SLA.");
    }
    if (interventionBudgetShiftPct > 0) {
      mitigationAdvice.push(`Allocated +${interventionBudgetShiftPct}% intervention budget can absorb ~${Math.round(interventionBudgetShiftPct * 0.6)} additional IEP candidates.`);
    }

    const result = {
      scenarioName,
      inputs: {
        enrolmentSurgePct,
        teacherAbsenteeismPct,
        interventionBudgetShiftPct
      },
      baseline,
      simulated: {
        averageClassSize: simulatedClassSize,
        teacherWeeklyHours: simulatedTeacherHours,
        slaBreachProbabilityPct: simulatedSlaBreachProb,
        operationalRiskScore: simulatedRiskScore,
        overloadedTeachersCount: simulatedOverloadedTeachers,
        estimatedMonthlyOvertimeCost: simulatedOvertimeCost
      },
      deltas: {
        classSizeDelta: Number((simulatedClassSize - baseline.averageClassSize).toFixed(1)),
        teacherHoursDelta: Number((simulatedTeacherHours - baseline.teacherWeeklyHours).toFixed(1)),
        riskScoreDelta: simulatedRiskScore - baseline.operationalRiskScore,
        costDelta: simulatedOvertimeCost - baseline.estimatedMonthlyOvertimeCost
      },
      recommendedMitigation: mitigationAdvice,
      simulatedAt: new Date().toISOString()
    };

    res.json(result);
  } catch (error) {
    console.error("Scenario simulation error:", error);
    res.status(500).json({ message: "Failed to simulate scenario" });
  }
});

// GET /api/scenarios
router.get("/scenarios", authenticateToken, (req, res) => {
  try {
    const scenarios = db.prepare("SELECT * FROM scenarios ORDER BY id DESC").all();
    res.json(scenarios);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch saved scenarios" });
  }
});

// POST /api/scenarios
router.post("/scenarios", authenticateToken, (req, res) => {
  try {
    const { name, description, parameters, baseline_impact, projected_impact } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Scenario name is required" });
    }

    const insert = db.prepare(`
      INSERT INTO scenarios (name, description, parameters, baseline_impact, projected_impact, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      name,
      description || "",
      typeof parameters === "object" ? JSON.stringify(parameters) : String(parameters),
      typeof baseline_impact === "object" ? JSON.stringify(baseline_impact) : String(baseline_impact),
      typeof projected_impact === "object" ? JSON.stringify(projected_impact) : String(projected_impact),
      req.user.name
    );

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "SCENARIO_CREATE",
      entity: "Scenario",
      details: `Saved What-If scenario: ${name}`,
      status: "Success"
    });

    res.status(201).json({ message: "Scenario saved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to save scenario" });
  }
});

module.exports = router;
