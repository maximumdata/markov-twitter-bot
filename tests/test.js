let expect = require('chai').expect
let TwitterBot = require('../index')

describe('Markov-Twitter-Bot', () => {
  it('throws with no account', () => {
    let fn = () => {
      return new TwitterBot({account: null})
    }
    expect(fn).to.throw(/No twitter account/)
  })
  it('throws with no twitter API credentials', () => {
    let fn = () => {
      return new TwitterBot({
        account: 'test',
        twitter: {
          consumer_key: null,
          consumer_secret: null,
          access_token_key: null,
          access_token_secret: null
        }
      })
    }
    expect(fn).to.throw(/Missing twitter API/)
  })
})
