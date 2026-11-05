import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { appData, learner, routine } from '../domain/testData';
import type { AppData } from '../domain/types';
import { promptKey } from '../domain/types';
import { HeartRateProvider } from '../services/heartRate';
import { StoreProvider, useStore } from '../state/store';
import { Player, REWARD_MS } from './Player';

// Integration test: the real Player, store and session reducer working together.

let latest: AppData;
function Spy() {
  latest = useStore().data;
  return null;
}

function renderPlayer(data: AppData) {
  return render(
    <StoreProvider initialData={data}>
      <HeartRateProvider>
        <MemoryRouter
          initialEntries={['/learn/l1/play/r1']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/learn/:learnerId/play/:routineId" element={<Player />} />
            <Route path="/learn/:learnerId" element={<p>Learner home</p>} />
          </Routes>
          <Spy />
        </MemoryRouter>
      </HeartRateProvider>
    </StoreProvider>,
  );
}

const choiceButton = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Player', () => {
  it('shows the First/Then board before the first step', () => {
    renderPlayer(appData());
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Play time')).toBeTruthy();
  });

  it('at Full help only the right choice can be tapped', () => {
    renderPlayer(appData());
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect((choiceButton(/Choice wrong/) as HTMLButtonElement).disabled).toBe(true);
    expect(choiceButton(/Choice right/).className).toContain('is-target-full');
  });

  it('redirects an off-target tap without an error and records it', () => {
    const independent = {
      [promptKey('l1', 's1')]: { level: 0 as const, streak: 0 },
      [promptKey('l1', 's2')]: { level: 0 as const, streak: 0 },
    };
    renderPlayer(appData({ prompts: independent, routines: [routine({ steps: [routine().steps[0]] })] }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(choiceButton(/Choice right/).className).not.toContain('is-target');
    fireEvent.click(choiceButton(/Choice wrong/));
    expect(choiceButton(/Choice wrong/).className).toContain('is-faded');
    expect(choiceButton(/Choice right/).className).toContain('is-target');

    fireEvent.click(choiceButton(/Choice right/));
    expect(screen.getByText('Nice work!')).toBeTruthy();
    act(() => vi.advanceTimersByTime(REWARD_MS));
    expect(screen.getByText(/You did it, Alex!/)).toBeTruthy();

    expect(latest.sessions).toHaveLength(1);
    expect(latest.sessions[0].steps[0]).toMatchObject({ stepId: 's1', promptLevel: 0, wrongTaps: 1 });
    expect(latest.learners[0].tokens).toBe(1);
  });

  it('pauses for a break and resumes on the same step', () => {
    renderPlayer(appData({ learners: [learner({ calmMinSeconds: 0 })] }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: /I need a break/ }));
    expect(screen.getByRole('dialog', { name: 'Calm down break' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: "I'm ready" }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Do s1' })).toBeTruthy();
  });
});
