// written by me.
const admin = require('firebase-admin')
const datastore = require('@google-cloud/datastore')()
const runtimeVariable = require('./getVariable.js')
var stripe

const stripeKey = 'stripeKey'
const deployment = process.env.FUNCTION_NAME.split('-')[0]
const environment = process.env.FUNCTION_NAME.split('-')[2]

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://' + process.env.GCP_PROJECT + '.firebaseio.com'
});

exports.getCustomer = function getCustomer(req, res) {

  req.key = stripeKey
  req.deployment = deployment

  runtimeVariable.get(req)
  .then(registerStripe)
  .then(verifyIdToken)
  .then(getCustomerId)
  .then(getCustomerData)
  .then(function(request) {
    console.log(request);
    res.status(200).json(request.body.customer)
  })
  .catch(function(error) {
    console.error(error)
    res.status(500).send(error)
  })
}

var registerStripe = function(request) {
  stripe = require("stripe")(request[stripeKey])
  return Promise.resolve(request)
}

var verifyIdToken = function(request) {
  return admin.auth()
  .verifyIdToken(request.headers.authorization)
  .then(function(decodedToken) {
    request.body['decodedToken'] = decodedToken
    return Promise.resolve(request)
  }).catch(function(error) {
    return Promise.reject(error)
  });
}

var getCustomerId = function(request) {
  const userKey = datastore.key(['user', request.body.decodedToken.uid]);
  return datastore.get(userKey)
  .then((results) => {
    if (typeof results[0] === 'undefined') {
      return Promise.reject({Error: "No user found."})
    } else {
      request.body['customerID'] = results[0].customerID
      return Promise.resolve(request)
    }
  }).catch(function(error) {
    return Promise.reject(error)
  })
}

var getCustomerData = function(request) {
  return stripe.customers.retrieve(request.body.customerID)
  .then(function(customer) {
    request.body.customer = customer
    return Promise.resolve(request)
  })
  .catch(function(error) {
    return Promise.reject({Error: 'User does not have a Stripe account'})
  });
}
