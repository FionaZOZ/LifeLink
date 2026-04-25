'use client';
import * as React from 'react';

export type DemoRole = 'guest' | 'volunteer' | 'patient' | 'both';

const KEY = 'lifelink:demoRole';

export function getDemoRole(): DemoRole {
  if (typeof window === 'undefined') return 'guest';
  const v = window.localStorage.getItem(KEY);
  if (v === 'volunteer' || v === 'patient' || v === 'both') return v;
  return 'guest';
}

export function setDemoRole(role: DemoRole) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, role);
  window.dispatchEvent(new CustomEvent('lifelink:role-change', { detail: role }));
}

export function useDemoRole(): [DemoRole, (r: DemoRole) => void] {
  const [role, setRole] = React.useState<DemoRole>('guest');
  React.useEffect(() => {
    setRole(getDemoRole());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<DemoRole>).detail;
      setRole(detail ?? getDemoRole());
    };
    const onStorage = () => setRole(getDemoRole());
    window.addEventListener('lifelink:role-change', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('lifelink:role-change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  const update = React.useCallback((r: DemoRole) => {
    // update local state immediately AND persist + notify other hook instances
    setRole(r);
    setDemoRole(r);
  }, []);
  return [role, update];
}

export function isVolunteer(role: DemoRole) {
  return role === 'volunteer' || role === 'both';
}
export function isPatient(role: DemoRole) {
  return role === 'patient' || role === 'both';
}
