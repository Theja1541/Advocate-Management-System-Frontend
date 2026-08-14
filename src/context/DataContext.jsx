import React, { createContext, useContext, useState, useEffect } from 'react';
import { PERMS, COURTS } from '../data/mockData';
import { useAuth } from './AuthContext';
import { getCases } from '../services/caseService';
import { getClients } from '../services/clientService';
import { getAdvocates } from '../services/advocateService';
import { getDiaries } from '../services/diaryService';
import { getDaybookEntries } from '../services/daybookService';
import { getPayments } from '../services/paymentService';
import { getAlerts } from '../services/alertService';
import { getLands } from '../services/landService';
import { getOpinions } from '../services/opinionService';
import { getMemberships } from '../services/membershipService';
import { getActs, getAmendments } from '../services/actService';
import {
  updatePermission as persistPermission,
  getRoles,
  getRoleById,
  getModules,
} from '../services/roleService';

const DataContext = createContext(null);

const formatActEffectiveDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  if (value === '2024-07-01') return `w.e.f. ${day}.${month}.${year}`;
  return String(year);
};

const groupAmendments = (amendmentList) => {
  const groups = new Map();
  amendmentList.forEach((row) => {
    const key = `${row.sourceAct} → ${row.targetAct}`;
    if (!groups.has(key)) {
      groups.set(key, {
        g: key,
        effectiveDate: row.effectiveDate,
        rows: [],
      });
    }
    groups.get(key).rows.push([
      row.oldSection,
      row.oldTitle,
      row.newSection,
      row.newTitle,
    ]);
  });
  return Array.from(groups.values());
};

export const DataProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [cases, setCases] = useState([]);
  const [diary, setDiary] = useState([]);
  const [daybook, setDaybook] = useState([]);
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [lands, setLands] = useState([]);
  const [opinions, setOpinions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [clients, setClients] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [refs, setRefs] = useState([]);
  const [acts, setActs] = useState([]);
  const [amend, setAmend] = useState([]);
  const [perms, setPerms] = useState(PERMS);
  const [roleCatalog, setRoleCatalog] = useState([]);
  const [moduleCatalog, setModuleCatalog] = useState([]);
  const [dbSeq, setDbSeq] = useState(8);

  const refreshAllData = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const [
        caseList,
        clientList,
        advocateList,
        diaryList,
        daybookList,
        paymentList,
        alertList,
        landList,
        opinionList,
        membershipList,
        actList,
        amendmentList,
        roleList,
        moduleList,
      ] = await Promise.all([
        getCases(),
        getClients(),
        getAdvocates(),
        getDiaries(),
        getDaybookEntries(),
        getPayments(),
        getAlerts(),
        getLands(),
        getOpinions(),
        getMemberships().catch(() => []),
        getActs(),
        getAmendments(),
        getRoles(),
        getModules(),
      ]);

      const detailedRoles = await Promise.all(roleList.map((r) => getRoleById(r.id)));
      const getAccessLevel = (mod) =>
        mod?.Permission?.accessLevel ||
        mod?.permission?.accessLevel ||
        '—';

      const mappedPerms = {};
      detailedRoles.forEach((role) => {
        mappedPerms[role.name] = moduleList.map((mod) => {
          const linked = (role.modules || []).find((m) => Number(m.id) === Number(mod.id));
          return linked ? getAccessLevel(linked) : '—';
        });
      });

      // Map backend cases to frontend format
      const mappedCases = caseList.map(c => {
        let opponent = '—';
        const vsIdx = String(c.title || '').indexOf(' — vs ');
        if (vsIdx >= 0) {
          opponent = String(c.title).slice(vsIdx + ' — vs '.length);
        }
        return {
          id: c.id,
          no: c.caseNo,
          ct: c.court ? Math.max(0, COURTS.indexOf(c.court)) : 0,
          ty: c.caseType?.name || '—',
          cl: c.clientId,
          opp: opponent,
          adv: c.advocateId,
          stage: c.currentStage?.name || 'Filing',
          next: c.nextHearing || '—',
          val: Number(c.suitValue) || 0,
          st: (c.status || 'Active').toLowerCase(),
          lvl: c.approvalLevel || 4,
          fee: Number(c.feePercentage) || 0,
          advocateFee: Number(c.advocateFee) || 0,
          courtFee: Number(c.courtFee) || 0,
          totalPayable: Number(c.totalPayable) || 0
        };
      });

      // Map backend clients to frontend format
      const mappedClients = clientList.map(cl => ({
        id: cl.id,
        n: cl.name,
        mob: cl.mobile || '—',
        em: cl.email || '—',
        vil: cl.village || '—',
        aad: cl.aadhaarMasked || '—',
        pan: cl.panMasked || '—',
        docs: cl.docsCount || 0
      }));

      // Map backend advocates to frontend format
      const mappedAdvocates = advocateList.map(a => ({
        id: a.id,
        n: a.name,
        rel: a.relation || 'Junior',
        spec: a.specialization || '—',
        exp: parseInt(a.experience) || 0,
        en: a.enrolment || '—',
        bar: 'Bar Council of Andhra Pradesh',
        mob: a.mobile || '—',
        em: a.email || '—',
        st: a.status || 'active'
      }));

      // Map backend diary to frontend format
      const mappedDiaries = diaryList.map(d => ({
        id: d.id,
        d: d.hearingDate || '—',
        t: d.hearingTime || '—',
        no: d.case ? d.case.caseNo : '—',
        ct: d.courtIndex || 0,
        adv: d.advocateId,
        note: d.note || '',
        next: d.nextHearingDate || '—',
        att: d.attachmentsCount || 0
      }));

      // Map backend daybook to frontend format
      const mappedDaybook = daybookList.map(db => ({
        id: db.daybookCode || `DB-${String(db.id).padStart(3, '0')}`,
        d: db.transactionDate,
        c: db.category,
        x: db.particulars,
        m: db.paymentMode,
        t: db.type,
        a: Number(db.amount),
        by: db.recorder ? db.recorder.name : 'Admin'
      }));

      // Map backend payments to frontend format
      const mappedPayments = paymentList.map(p => ({
        id: p.receiptNo,
        no: p.case ? p.case.caseNo : '—',
        pt: p.partyType,
        who: p.partyId,
        amt: Number(p.amountReceived) || 0,
        due: Number(p.amountOutstanding) || 0,
        st: p.status,
        dt: p.transactionDate
      }));

      // Map backend lands to frontend format
      const mappedLands = landList.map(l => ({
        id: l.id,
        cl: l.clientId,
        no: l.case ? l.case.caseNo : '—',
        sy: l.surveyNo,
        ext: l.extent,
        vil: l.village,
        ti: l.titleStatus,
        val: l.classification
      }));

      // Map backend opinions to frontend format
      const mappedOpinions = opinionList.map(op => ({
        id: op.id,
        cl: op.clientId,
        ty: op.opinionType,
        dt: op.issueDate,
        adv: op.advocateId,
        st: op.titleStatus
      }));

      // Map backend alerts to frontend format
      const mappedAlerts = alertList.map(al => ({
        id: al.id,
        sev: al.severity,
        d: al.dueInfo || '—',
        no: al.type || '—',
        x: al.description,
        isResolved: Boolean(al.isResolved)
      }));

      // Map backend memberships to frontend format
      const mappedMemberships = membershipList.map(m => ({
        id: m.advocateId,
        plan: m.planName,
        fee: Number(m.feeAmount),
        start: m.startDate,
        exp: m.expiryDate,
        st: m.status
      }));

      // Map backend bare acts to frontend format
      const mappedActs = actList.map(a => ({
        id: a.id,
        n: a.name,
        ab: a.abbreviation,
        y: formatActEffectiveDate(a.effectiveDate),
        ty: a.type,
        d: a.description || '',
        sec: a.sectionsCount || 0,
        bm: Boolean(a.isBookmarked),
        pdf: a.pdfFile || null,
        pdfUrl: a.pdfUrl || null,
      }));

      // Map backend amendments to grouped frontend format
      const mappedAmend = groupAmendments(amendmentList);

      setCases(mappedCases);
      setClients(mappedClients);
      setAdvocates(mappedAdvocates);
      setDiary(mappedDiaries);
      setDaybook(mappedDaybook);
      setPayments(mappedPayments);
      setAlerts(mappedAlerts);
      setLands(mappedLands);
      setOpinions(mappedOpinions);
      setMembers(mappedMemberships);
      setActs(mappedActs);
      setAmend(mappedAmend);
      setRoleCatalog(detailedRoles);
      setModuleCatalog(moduleList);
      setPerms(Object.keys(mappedPerms).length ? mappedPerms : PERMS);

    } catch (err) {
      console.error('Failed to fetch data context from backend:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshAllData();
    } else {
      setCases([]);
      setDiary([]);
      setDaybook([]);
      setPayments([]);
      setMembers([]);
      setDocuments([]);
      setLands([]);
      setOpinions([]);
      setAlerts([]);
      setClients([]);
      setAdvocates([]);
      setRefs([]);
      setActs([]);
      setAmend([]);
      setRoleCatalog([]);
      setModuleCatalog([]);
      setPerms(PERMS);
    }
  }, [isAuthenticated]);

  const approveCaseLevel = (index, direction) => {
    setCases(prev => {
      const nextCases = [...prev];
      const caseItem = { ...nextCases[index] };
      if (direction > 0) {
        caseItem.lvl = Math.min(4, caseItem.lvl + 1);
        if (caseItem.lvl >= 4) {
          caseItem.st = 'active';
          caseItem.stage = 'Filing';
        }
      } else {
        caseItem.lvl = Math.max(0, caseItem.lvl - 1);
        if (caseItem.lvl < 4) {
          caseItem.st = 'pending';
        }
      }
      nextCases[index] = caseItem;
      return nextCases;
    });
  };

  const addDaybookEntry = (entry) => {
    const nextSeq = dbSeq + 1;
    setDbSeq(nextSeq);
    const newEntry = {
      id: `DB-${String(nextSeq).padStart(3, '0')}`,
      d: entry.d,
      c: entry.c,
      x: entry.x,
      m: entry.m,
      t: entry.t,
      a: entry.a,
      by: 'P. Raghavendra Rao'
    };
    setDaybook(prev => [...prev, newEntry]);
  };

  const addCase = (caseItem) => {
    setCases(prev => [caseItem, ...prev]);
  };

  const addClient = (clientItem) => {
    setClients(prev => [...prev, clientItem]);
  };

  const addAdvocate = (advocateItem) => {
    setAdvocates(prev => [...prev, advocateItem]);
  };

  const addDiaryEntry = (diaryItem) => {
    setDiary(prev => [diaryItem, ...prev]);
  };

  const addDocument = (documentItem) => {
    setDocuments(prev => [documentItem, ...prev]);
  };

  const addReference = (referenceItem) => {
    setRefs(prev => [referenceItem, ...prev]);
  };

  const addLand = (landItem) => {
    setLands(prev => [landItem, ...prev]);
  };

  const addOpinion = (opinionItem) => {
    setOpinions(prev => [opinionItem, ...prev]);
  };

  const addPayment = (paymentItem) => {
    setPayments(prev => [paymentItem, ...prev]);
  };

  const renewMember = (id) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, st: 'active', start: '24 Jul 2026', exp: '23 Jul 2027' } : m));
  };

  const updatePermission = async (roleOrPayload, moduleIndex, value) => {
    let roleId; let targetTenantId;
    let moduleId;
    let accessLevel;
    let roleName;
    let modIndex;

    if (typeof roleOrPayload === 'object' && roleOrPayload !== null) {
      roleId = roleOrPayload.roleId;
      moduleId = roleOrPayload.moduleId;
      accessLevel = roleOrPayload.accessLevel;
      roleName = roleOrPayload.roleName;
      modIndex = roleOrPayload.moduleIndex; targetTenantId = roleOrPayload.targetTenantId;
    } else {
      roleName = roleOrPayload;
      modIndex = moduleIndex;
      accessLevel = value;
      const role = roleCatalog.find((r) => r.name === roleName);
      const mod = moduleCatalog[modIndex];
      roleId = role?.id;
      moduleId = mod?.id;
    }

    if (roleId == null || moduleId == null || accessLevel == null) {
      throw new Error('roleId, moduleId and accessLevel are required');
    }

    const permission = await persistPermission({
      roleId: Number(roleId),
      moduleId: Number(moduleId),
      accessLevel,
      targetTenantId,
    });

    const resolvedRoleName =
      roleName ||
      roleCatalog.find((r) => Number(r.id) === Number(roleId))?.name;
    const resolvedModIndex =
      modIndex != null
        ? modIndex
        : moduleCatalog.findIndex((m) => Number(m.id) === Number(moduleId));

    if (resolvedRoleName && resolvedModIndex >= 0) {
      setPerms((prev) => {
        const nextPerms = { ...prev };
        const current = Array.isArray(nextPerms[resolvedRoleName])
          ? [...nextPerms[resolvedRoleName]]
          : moduleCatalog.map(() => '—');
        current[resolvedModIndex] = accessLevel;
        nextPerms[resolvedRoleName] = current;
        return nextPerms;
      });
    }

    return permission;
  };

  return (
    <DataContext.Provider value={{
      cases, setCases,
      diary, setDiary,
      daybook, setDaybook,
      payments, setPayments,
      members, setMembers,
      documents, setDocuments,
      lands, setLands,
      opinions, setOpinions,
      alerts, setAlerts,
      clients, setClients,
      advocates, setAdvocates,
      refs, setRefs,
      acts, setActs,
      amend, setAmend,
      perms, setPerms,
      roleCatalog,
      moduleCatalog,
      approveCaseLevel,
      addDaybookEntry,
      addCase,
      addClient,
      addAdvocate,
      addDiaryEntry,
      addDocument,
      addReference,
      addLand,
      addOpinion,
      addPayment,
      renewMember,
      updatePermission,
      refreshAllData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useLegalData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useLegalData must be used within a DataProvider');
  }
  return context;
};
