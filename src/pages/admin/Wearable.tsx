import { useHeartRate } from '../../lib/heartRate';

export function Wearable() {
  const hr = useHeartRate();
  return (
    <>
      <h1>Wearable</h1>
      <p className="muted">
        LifeSync watches heart rate while a routine is running. When it stays above the learner's threshold, the routine
        pauses and the calm screen opens.
      </p>

      <section className="card hr-status">
        <div className="hr-reading" aria-live="polite">
          <span className="hr-heart" aria-hidden>♥</span>
          <span className="hr-bpm">{hr.bpm ?? '--'}</span>
          <span className="muted">bpm</span>
        </div>
        <p>
          {hr.source === 'none' && 'Not connected.'}
          {hr.source !== 'none' && `Connected: ${hr.deviceName}`}
        </p>
        {hr.error && <p className="error">{hr.error}</p>}
        <div className="row">
          <button type="button" onClick={hr.connectBluetooth} disabled={!hr.bluetoothSupported}>
            Connect Bluetooth heart-rate device
          </button>
          <button type="button" className="secondary" onClick={hr.startSimulator}>Use simulator</button>
          {hr.source !== 'none' && (
            <button type="button" className="secondary" onClick={hr.disconnect}>Disconnect</button>
          )}
        </div>
        {!hr.bluetoothSupported && (
          <p className="muted small">This browser doesn't support Web Bluetooth. Chrome or Edge on desktop or Android do.</p>
        )}
      </section>

      {hr.source === 'simulator' && (
        <section className="card">
          <h2>Simulator</h2>
          <label className="field">
            Target heart rate: {hr.simTarget} bpm
            <input type="range" min={60} max={150} value={hr.simTarget} onChange={(e) => hr.setSimTarget(Number(e.target.value))} />
          </label>
          <p className="muted small">
            During a routine a ♥ button sits in the bottom corner so you can raise the heart rate and watch the calm screen
            take over.
          </p>
        </section>
      )}

      <section className="card">
        <h2>Which devices work?</h2>
        <ul className="steps-list">
          <li>Chest straps and arm bands that use the standard Bluetooth heart-rate profile (Polar, Wahoo, Garmin HRM and similar).</li>
          <li>Watches with a "broadcast heart rate" mode, such as many Garmin and some Wear OS watches.</li>
          <li>Apple Watch and Fitbit don't broadcast to browsers. They need a companion app, which is on the roadmap.</li>
        </ul>
      </section>
    </>
  );
}
