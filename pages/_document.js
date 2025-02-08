// pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Meta tag yang memberi tahu Farcaster bahwa ini adalah frame */}
          <meta name="farcaster-frame" content="true" />
          {/* Pastikan viewport responsif */}
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        {/* Atur body tanpa margin, padding, dan tanpa overflow untuk menghindari scroll */}
        <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
