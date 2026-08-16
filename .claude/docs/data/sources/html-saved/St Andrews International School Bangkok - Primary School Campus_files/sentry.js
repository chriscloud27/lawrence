const waitForSentry = () => {
    if (window.Sentry) {
        Sentry.init({
            dsn: 'https://efcbf22778b4de66d3a954aa32037d83@o4508234301177856.ingest.de.sentry.io/4508234302816336',
            beforeSend(event, hint) {
                const error = hint && hint.originalException;
                const message = (error && error.message) || (event && event.message) || '';
                if (message.includes('getUIString')) return null;
                return event;
            },
        })
    } else {
        setTimeout(waitForSentry, 100);
    }
};
waitForSentry();