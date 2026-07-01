import { ScrollViewStyleReset } from "expo-router/html";
import React from "react";

/**
 * This file is web-only and used to configure the root HTML for every
 * web page during static rendering. Any modifications to this file
 * only affect the web build and do not apply to native (iOS/Android).
 *
 * PWA setup: links the manifest + theme-color so the site can be added
 * to the home screen as a full-screen, standalone app.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* PWA / Add to Home Screen */}
        <meta name="theme-color" content="#0B0F1A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Starks Global Group" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />
        <link rel="icon" href="/assets/images/icon.png" />

        {/*
          Disable body scrolling on web. This makes ScrollView components use
          native scrolling and helps avoid double scrollbars.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #0B0F1A;
}`;
