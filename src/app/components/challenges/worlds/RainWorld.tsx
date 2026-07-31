export function RainWorld() {
  return (
    <div className="challenge-world challenge-rain-world">
      <div className="challenge-sun" aria-hidden="true" />
      <div className="challenge-cloud challenge-cloud--one" aria-hidden="true" />
      <div className="challenge-cloud challenge-cloud--two" aria-hidden="true" />
      <div className="challenge-wind" aria-hidden="true">
        〰
      </div>
      <div className="challenge-lightning" aria-hidden="true">
        ϟ
      </div>
      <div className="challenge-rain-drops" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
      <div className="challenge-puddle" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
