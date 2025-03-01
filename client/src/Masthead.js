// Masthead.js
import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function Masthead() {
  return (
    <Navbar bg="dark" variant="dark">
      <Container>
      <Nav className="mr-auto">
        <Nav.Link as={Link} to="/">Dictate</Nav.Link>
      </Nav>
      </Container>
    </Navbar>
  );
}

export default Masthead;