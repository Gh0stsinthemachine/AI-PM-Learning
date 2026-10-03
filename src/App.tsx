import React from 'react';
import { useRoute } from './router';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { RoundPage } from './pages/RoundPage';
import { Journey } from './pages/Journey';
import { About } from './pages/About';

export function App(props: { initial?: { route?: string } }) {
  const route = useRoute();
  // The initial route comes from the viewer's republish snapshot, when there is one.
  React.useEffect(() => {
    const r = props.initial?.route;
    if (r && r !== window.location.hash && !window.location.hash) window.location.hash = r;
  }, []);
  React.useEffect(() => {
    if (route.name !== 'round') window.scrollTo?.(0, 0);
  }, [route.name]);

  return (
    <div className="app">
      <Header route={route} />
      <main id="main">
        {route.name === 'home' && <Home />}
        {route.name === 'round' && <RoundPage key={route.id} id={route.id} />}
        {route.name === 'journey' && <Journey />}
        {route.name === 'about' && <About />}
      </main>
    </div>
  );
}
