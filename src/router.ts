import { useEffect, useState } from 'react';

/** Minimal hash router — keeps the app fully static (works from any host or a local file). */
export interface Route {
  path: string[];
  query: URLSearchParams;
}

const parse = (): Route => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [p, q = ''] = hash.split('?');
  return { path: p.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q) };
};

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const navigate = (to: string) => {
  window.location.hash = to.startsWith('/') ? to : `/${to}`;
};
