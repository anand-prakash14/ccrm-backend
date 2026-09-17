// Manual end-to-end smoke test across CA-2, CA-10, CA-17, CA-24, CA-25,
// CA-26, CA-27, CA-28 (backend half), CA-29, CA-43, CA-66, CA-67, CA-83,
// CA-84, CA-92, CA-93, CA-94. Not a Jest suite (full suite deferred per
// current direction) — run manually against the dev server:
//   SALESMAN_ROLE_ID=<uuid> node scripts/smoke-test.mjs
const BASE = 'http://localhost:3000';
const SALESMAN_ROLE_ID = process.env.SALESMAN_ROLE_ID;
if (!SALESMAN_ROLE_ID) {
  console.error("Set SALESMAN_ROLE_ID env var (SELECT id FROM role WHERE name='SalesMan')");
  process.exit(1);
}

let passed = 0;
let failed = 0;

function check(label, condition, extra) {
  if (condition) {
    passed++;
    console.log(`PASS  ${label}`);
  } else {
    failed++;
    console.log(`FAIL  ${label}${extra !== undefined ? ' -- ' + JSON.stringify(extra) : ''}`);
  }
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }
  return { status: res.status, json };
}

async function login(email, password) {
  const { status, json } = await api('POST', '/v1/auth/login', null, { email, password });
  if (status !== 200)
    throw new Error(`login failed for ${email}: ${status} ${JSON.stringify(json)}`);
  return json.data;
}

async function createSalesman(adminToken, label) {
  const email = `smoke-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@ccrm.local`;
  const { status, json } = await api('POST', '/v1/users', adminToken, {
    name: `Smoke ${label}`,
    email,
    roleId: SALESMAN_ROLE_ID,
  });
  if (status !== 201) throw new Error(`create user failed: ${status} ${JSON.stringify(json)}`);
  const session = await login(email, json.data.temporaryPassword);
  return session;
}

async function main() {
  const admin = await login('admin@ccrm.local', 'ChangeMe@123');
  const salesmanA = await createSalesman(admin.token, 'A');
  const salesmanB = await createSalesman(admin.token, 'B');

  // --- CA-2: Create Enquiry ---
  {
    const { status, json } = await api('POST', '/v1/leads', salesmanA.token, {
      name: 'Buyer One',
      phone: '9990001111',
      source: 'Website',
    });
    check('CA-2: create enquiry succeeds', status === 201 && json.data.stage === 'Enquiry', json);

    const { status: missingStatus } = await api('POST', '/v1/leads', salesmanA.token, {
      name: 'X',
    });
    check('CA-2: missing phone/source rejected (422)', missingStatus === 422);
  }

  const { json: enquiryJson } = await api('POST', '/v1/leads', salesmanA.token, {
    name: 'Pipeline Buyer',
    phone: '9990002222',
    source: 'Referral',
  });
  const leadId = enquiryJson.data.id;

  // --- CA-43: SalesMan B cannot see/edit SalesMan A's lead ---
  {
    const { status } = await api('GET', `/v1/leads/${leadId}`, salesmanB.token);
    check('CA-43: SalesMan B blocked from SalesMan A lead (403)', status === 403);
  }
  // --- CA-66: Admin can see any lead ---
  {
    const { status } = await api('GET', `/v1/leads/${leadId}`, admin.token);
    check('CA-66: Admin can view any lead', status === 200);
  }

  // --- CA-10: Advance to Lead stage ---
  {
    const { status: missingStatus } = await api('PATCH', `/v1/leads/${leadId}`, salesmanA.token, {
      stage: 'Lead',
      fields: { email: 'buyer@example.com' }, // missing 4 required fields
    });
    check('CA-10: missing Lead-stage fields rejected (422)', missingStatus === 422);

    const { status, json } = await api('PATCH', `/v1/leads/${leadId}`, salesmanA.token, {
      stage: 'Lead',
      fields: {
        email: 'buyer@example.com',
        alternatePhone: '9990003333',
        propertyType: 'Apartment',
        preferredLocations: 'Downtown',
        leadTemperature: 'Hot',
      },
      assignedSalemanId: salesmanA.user.id,
    });
    check('CA-10: advance to Lead succeeds', status === 200 && json.data.stage === 'Lead', json);
  }

  // --- CA-17: Advance to Opportunity ---
  {
    const { status: missingStatus } = await api('PATCH', `/v1/leads/${leadId}`, salesmanA.token, {
      stage: 'Opportunity',
      fields: { budgetMin: 100000 }, // budgetMax missing
    });
    check('CA-17: budgetMax-only rejected (422)', missingStatus === 422);

    const { status, json } = await api('PATCH', `/v1/leads/${leadId}`, salesmanA.token, {
      stage: 'Opportunity',
      fields: {
        budgetMin: 100000,
        budgetMax: 200000,
        purpose: 'Investment',
        financingStatus: 'Pre-approved',
        purchaseTimeline: '3 months',
      },
    });
    check(
      'CA-17: advance to Opportunity succeeds',
      status === 200 && json.data.stage === 'Opportunity',
      json,
    );
  }

  // --- Kanban guard: PATCH cannot jump straight to Site Visit/Conclusion ---
  {
    const { status } = await api('PATCH', `/v1/leads/${leadId}`, salesmanA.token, {
      stage: 'Site Visit',
    });
    check('PATCH stage=Site Visit rejected (422, must use dedicated endpoint)', status === 422);
  }

  // --- CA-67: reassignment is Admin-only ---
  {
    const { status } = await api('PATCH', `/v1/leads/${leadId}`, salesmanA.token, {
      assignedSalemanId: salesmanB.user.id,
    });
    check('CA-67: SalesMan reassignment rejected (403)', status === 403);

    const { status: adminStatus, json } = await api('PATCH', `/v1/leads/${leadId}`, admin.token, {
      assignedSalemanId: salesmanB.user.id,
    });
    check(
      'CA-67: Admin reassignment succeeds',
      adminStatus === 200 && json.data.assignedSalemanId === salesmanB.user.id,
      { adminStatus, json },
    );

    // reassign back to A so the rest of the flow keeps working as A
    await api('PATCH', `/v1/leads/${leadId}`, admin.token, {
      assignedSalemanId: salesmanA.user.id,
    });
  }

  // --- CA-151/CA-152: BHK types + Property master data ---
  let property1Id;
  let property2Id;
  let property3Id;
  {
    const { status: bhkStatus, json: bhkJson } = await api('GET', '/v1/bhk-types', salesmanA.token);
    check(
      'CA-151: bhk-types seeded with 5 fixed types',
      bhkStatus === 200 && bhkJson.data.length === 5,
      bhkJson,
    );
    const twoBhk = bhkJson.data.find((b) => b.name === '2BHK');
    const threeBhk = bhkJson.data.find((b) => b.name === '3BHK');

    const { status: forbiddenCreate } = await api('POST', '/v1/properties', salesmanA.token, {
      name: 'Should Fail',
      projectName: 'X',
      city: 'Pune',
      locality: 'Baner',
      bhkTypeId: twoBhk.id,
      price: 5000000,
    });
    check('CA-152: SalesMan blocked from creating a property (403)', forbiddenCreate === 403);

    const { status: missingFieldsStatus } = await api('POST', '/v1/properties', admin.token, {
      name: 'Incomplete',
    });
    check('CA-152: missing required property fields rejected (422)', missingFieldsStatus === 422);

    const { status: p1Status, json: p1Json } = await api('POST', '/v1/properties', admin.token, {
      name: 'Skyline Towers A-1204',
      projectName: 'Skyline Towers',
      city: 'Pune',
      locality: 'Baner',
      bhkTypeId: twoBhk.id,
      areaSqft: 950,
      price: 6500000,
    });
    check('CA-152: Admin creates property 1', p1Status === 201, p1Json);
    property1Id = p1Json?.data?.id;

    const { status: p2Status, json: p2Json } = await api('POST', '/v1/properties', admin.token, {
      name: 'Skyline Towers B-2201',
      projectName: 'Skyline Towers',
      city: 'Pune',
      locality: 'Baner',
      bhkTypeId: threeBhk.id,
      areaSqft: 1400,
      price: 9500000,
    });
    property2Id = p2Json?.data?.id;

    const { status: p3Status, json: p3Json } = await api('POST', '/v1/properties', admin.token, {
      name: 'Green Meadows C-0501',
      projectName: 'Green Meadows',
      city: 'Pune',
      locality: 'Wakad',
      bhkTypeId: twoBhk.id,
      areaSqft: 900,
      price: 6200000,
    });
    property3Id = p3Json?.data?.id;
    check(
      'CA-152: all 3 properties created',
      p1Status === 201 && p2Status === 201 && p3Status === 201,
    );

    const { status: searchStatus, json: searchJson } = await api(
      'GET',
      '/v1/properties?city=Pune&locality=Baner',
      salesmanA.token,
    );
    check(
      'CA-152: SalesMan can search properties by city/locality',
      searchStatus === 200 && searchJson.data.length >= 2,
      searchJson,
    );

    const { status: updateForbidden } = await api(
      'PATCH',
      `/v1/properties/${property1Id}`,
      salesmanA.token,
      { status: 'Sold' },
    );
    check('CA-152: SalesMan blocked from updating a property (403)', updateForbidden === 403);

    const { status: updateStatus, json: updateJson } = await api(
      'PATCH',
      `/v1/properties/${property1Id}`,
      admin.token,
      { price: 6600000 },
    );
    check(
      'CA-152: Admin updates a property',
      updateStatus === 200 && updateJson.data.price === 6600000,
      updateJson,
    );
  }

  // --- CA-153: Attach one or more Properties to a Site Visit ---
  let visitId;
  {
    const { status: missingStatus } = await api(
      'POST',
      `/v1/leads/${leadId}/site-visits`,
      salesmanA.token,
      {
        scheduledAt: new Date().toISOString(),
        accompanyingSalemanId: salesmanA.user.id,
        propertyIds: [],
      },
    );
    check('CA-153: empty propertyIds rejected (422)', missingStatus === 422);

    const { status: unknownPropertyStatus } = await api(
      'POST',
      `/v1/leads/${leadId}/site-visits`,
      salesmanA.token,
      {
        scheduledAt: new Date().toISOString(),
        accompanyingSalemanId: salesmanA.user.id,
        propertyIds: ['00000000-0000-0000-0000-000000000000'],
      },
    );
    check('CA-153: non-existent property id rejected (400)', unknownPropertyStatus === 400);

    const { status, json } = await api('POST', `/v1/leads/${leadId}/site-visits`, salesmanA.token, {
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      accompanyingSalemanId: salesmanA.user.id,
      propertyIds: [property1Id, property2Id],
    });
    check(
      'CA-153: site visit created with 2 attached properties, lead stage -> Site Visit',
      status === 201 && json.data.properties.length === 2,
      json,
    );
    visitId = json?.data?.id;

    const { status: leadStatus, json: leadJson } = await api(
      'GET',
      `/v1/leads/${leadId}`,
      salesmanA.token,
    );
    check(
      'CA-153/CA-24: lead stage is Site Visit',
      leadStatus === 200 && leadJson.data.stage === 'Site Visit',
      leadJson,
    );

    const { status: listStatus, json: listJson } = await api(
      'GET',
      `/v1/leads/${leadId}/site-visits`,
      salesmanA.token,
    );
    check(
      'CA-153: GET site-visits list returns the visit with embedded properties',
      listStatus === 200 &&
        listJson.data.length === 1 &&
        listJson.data[0].properties.every((p) => p.status === 'Scheduled'),
      listJson,
    );

    const { status: attachStatus, json: attachJson } = await api(
      'POST',
      `/v1/leads/${leadId}/site-visits/${visitId}/properties`,
      salesmanA.token,
      { propertyId: property3Id },
    );
    check(
      'CA-153: attach an additional property to an in-progress visit',
      attachStatus === 201 && attachJson.data.status === 'Scheduled',
      attachJson,
    );

    const { status: dupAttachStatus } = await api(
      'POST',
      `/v1/leads/${leadId}/site-visits/${visitId}/properties`,
      salesmanA.token,
      { propertyId: property3Id },
    );
    check('CA-153: attaching the same property twice rejected (409)', dupAttachStatus === 409);
  }

  // --- CA-154: Track individual Property status within a Site Visit ---
  {
    const { status, json } = await api(
      'PATCH',
      `/v1/leads/${leadId}/site-visits/${visitId}/properties/${property1Id}`,
      salesmanA.token,
      { status: 'Shortlisted', notes: 'Buyer loved the balcony view' },
    );
    check(
      "CA-154: update one property's status to Shortlisted",
      status === 200 && json.data.status === 'Shortlisted',
      json,
    );

    const { status: rejectStatus, json: rejectJson } = await api(
      'PATCH',
      `/v1/leads/${leadId}/site-visits/${visitId}/properties/${property2Id}`,
      salesmanA.token,
      { status: 'Rejected', notes: 'Too far from school' },
    );
    check("CA-154: update a different property's status to Rejected", rejectStatus === 200);

    const { status: listStatus, json: listJson } = await api(
      'GET',
      `/v1/leads/${leadId}/site-visits`,
      salesmanA.token,
    );
    const visit = listJson?.data?.find((v) => v.id === visitId);
    const p1 = visit?.properties?.find((p) => p.propertyId === property1Id);
    const p2 = visit?.properties?.find((p) => p.propertyId === property2Id);
    const p3 = visit?.properties?.find((p) => p.propertyId === property3Id);
    check(
      'CA-154: each property tracks its own status independently on the same visit',
      listStatus === 200 &&
        p1?.status === 'Shortlisted' &&
        p2?.status === 'Rejected' &&
        p3?.status === 'Scheduled',
      { p1: p1?.status, p2: p2?.status, p3: p3?.status },
    );
  }

  // --- CA-25: Track Site Visit's own overall status/feedback (independent of per-property status) ---
  {
    const { status: missingFeedback } = await api(
      'PATCH',
      `/v1/leads/${leadId}/site-visits/${visitId}`,
      salesmanA.token,
      { status: 'Completed' },
    );
    check('CA-25: Completed without feedback rejected (422)', missingFeedback === 422);

    const { status } = await api(
      'PATCH',
      `/v1/leads/${leadId}/site-visits/${visitId}`,
      salesmanA.token,
      {
        status: 'Completed',
        visitFeedback: 'Buyer liked the unit, requested pricing follow-up',
      },
    );
    check('CA-25: Completed with feedback succeeds', status === 200);
  }

  // --- CA-83/84: Activity log note + read ---
  {
    const { status } = await api('POST', `/v1/leads/${leadId}/activity-log`, salesmanA.token, {
      content: 'Called buyer, confirmed strong interest',
    });
    check('CA-83: SalesMan A can add note to own lead', status === 201);

    const { status: forbiddenStatus } = await api(
      'POST',
      `/v1/leads/${leadId}/activity-log`,
      salesmanB.token,
      { content: 'Should not be allowed' },
    );
    check("CA-83: SalesMan B blocked from adding note to A's lead (403)", forbiddenStatus === 403);

    const { status: getStatus, json } = await api(
      'GET',
      `/v1/leads/${leadId}/activity-log`,
      salesmanA.token,
    );
    const hasStageChange = json?.data?.some((e) => e.entryType === 'stage_change');
    const hasNote = json?.data?.some((e) => e.entryType === 'note');
    const hasSiteVisitFeedback = json?.data?.some((e) => e.entryType === 'site_visit_feedback');
    check(
      'CA-84: activity log contains auto stage_change, note, and site_visit_feedback entries',
      getStatus === 200 && hasStageChange && hasNote && hasSiteVisitFeedback,
      json?.data?.map((e) => e.entryType),
    );
  }

  // --- CA-26: Conclusion Won ---
  {
    const { status: missingStatus } = await api(
      'POST',
      `/v1/leads/${leadId}/conclusion`,
      salesmanA.token,
      {
        outcome: 'Won',
        unitBooked: 'A-1204',
      },
    );
    check('CA-26: Won missing fields rejected (422)', missingStatus === 422);

    const { status, json } = await api('POST', `/v1/leads/${leadId}/conclusion`, salesmanA.token, {
      outcome: 'Won',
      unitBooked: 'A-1204',
      bookingTokenAmount: 50000,
      salePrice: 195000,
      bookingDate: '2026-09-20',
    });
    check(
      'CA-26: Won with all fields succeeds',
      status === 201 && json.data.outcome === 'Won',
      json,
    );

    const { status: dupStatus } = await api(
      'POST',
      `/v1/leads/${leadId}/conclusion`,
      salesmanA.token,
      {
        outcome: 'On-hold',
      },
    );
    check('Second conclusion on same lead rejected (409)', dupStatus === 409);

    const { status: leadStatus, json: leadJson } = await api(
      'GET',
      `/v1/leads/${leadId}`,
      salesmanA.token,
    );
    check(
      'CA-26: lead stage is Conclusion',
      leadStatus === 200 && leadJson.data.stage === 'Conclusion',
    );
  }

  // --- CA-27: Conclusion Lost (on a second, fresh lead) ---
  {
    const { json: e2 } = await api('POST', '/v1/leads', salesmanA.token, {
      name: 'Buyer Two',
      phone: '9990004444',
      source: 'Cold Call',
    });
    const lead2Id = e2.data.id;

    const { status: missingReason } = await api(
      'POST',
      `/v1/leads/${lead2Id}/conclusion`,
      salesmanA.token,
      {
        outcome: 'Lost',
      },
    );
    check('CA-27: Lost without reason rejected (422)', missingReason === 422);

    const { status } = await api('POST', `/v1/leads/${lead2Id}/conclusion`, salesmanA.token, {
      outcome: 'Lost',
      lostReason: 'Budget',
      notes: 'Priced out',
    });
    check('CA-27: Lost with valid reason succeeds', status === 201);

    const { json: e3 } = await api('POST', '/v1/leads', salesmanA.token, {
      name: 'Buyer Three',
      phone: '9990005555',
      source: 'Walk-in',
    });
    const { status: onHoldStatus } = await api(
      'POST',
      `/v1/leads/${e3.data.id}/conclusion`,
      salesmanA.token,
      {
        outcome: 'On-hold',
      },
    );
    check('CA-27: On-hold with no extra fields succeeds', onHoldStatus === 201);
  }

  // --- CA-29: Filterable list + CA-43 scoping ---
  {
    const { status, json } = await api('GET', '/v1/leads?stage=Conclusion', salesmanA.token);
    check(
      'CA-29: SalesMan list is force-scoped to own leads regardless of filter',
      status === 200 && json.data.every((l) => l.assignedSalemanId === salesmanA.user.id),
      json,
    );

    const { status: adminStatus, json: adminJson } = await api('GET', '/v1/leads', admin.token);
    check(
      'CA-29/CA-66: Admin list includes leads across SalesMen',
      adminStatus === 200 && adminJson.data.length >= 4,
    );
  }

  // --- CA-92/93/94: Dashboard ---
  {
    const { status, json } = await api('GET', '/v1/dashboard/summary', salesmanA.token);
    check(
      'CA-92: SalesMan dashboard has 4 conversion-by-stage entries',
      status === 200 && json.data.conversionByStage.length === 4,
      json,
    );
    check(
      'CA-93: bySaleman omitted for SalesMan caller',
      json.data.bySaleman === undefined,
      json.data,
    );
    check('CA-94: bySource present for SalesMan', Array.isArray(json.data.bySource));

    const { status: adminStatus, json: adminJson } = await api(
      'GET',
      '/v1/dashboard/summary',
      admin.token,
    );
    check(
      'CA-93: bySaleman present for Admin caller',
      adminStatus === 200 &&
        Array.isArray(adminJson.data.bySaleman) &&
        adminJson.data.bySaleman.length > 0,
      adminJson.data.bySaleman,
    );
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
