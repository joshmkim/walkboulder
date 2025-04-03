// ********************** Initialize server **********************************

const server = require('../index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server running:', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

describe('Register', () => {
    // Sample test case given to test / endpoint.
    it('Adds user correctly', done => {
      chai
        .request(server)
        .post('/register')
        .send({username: 'heyheyhey', password: '12345'})
        .end((err, res) => {
          expect(res).to.have.status(200);
          done();
        });
    });
  });

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

// ********************************************************************************