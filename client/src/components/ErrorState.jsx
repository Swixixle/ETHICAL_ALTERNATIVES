import './ErrorState.css';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <p className="error-state__text">{message || 'Something went wrong.'}</p>
      {onRetry ? (
        <button type="button" className="error-state__btn" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
