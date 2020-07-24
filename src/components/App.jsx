import React from 'react';

import Header from '@c/Header';

class App extends React.Component {
  render() {
    const path = window.location.pathname;

    return (
      <div className="App">
        <Header />
        <h1>Hello, world!</h1>
        {path === '/' && <div>Home page!</div>}
      </div>
    );
  }
}

export default App;
