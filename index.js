const Twitter = require('twitter')
const MarkovGen = require('markov-generator')
const tipots = require('this-is-probably-ok-to-say')

class TwitterBot {

  constructor (options) {
    this.options = {
      frequency: 'hourly',
      interval: 4,
      account: 'haunted_shrub',
      db: null,
      twitter: {
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
        access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
      }
    }

    Object.assign(this.options, options)

    this.twitterClient = this.createTwitterClient()
    this.getTweets((tweets) => {
      this.arrayOfTweets = tweets
      console.log(this.generateTweet())
    })
  }

  createTwitterClient () {
    let noMissingKeys = true
    let missingKey
    let expectedStructure = {
      consumer_key: '',
      consumer_secret: '',
      access_token_key: '',
      access_token_secret: ''
    }

    // make sure api keys are not false
    for (let key in this.options.twitter) {
      if (!this.options.twitter[key]) {
        noMissingKeys = false
      }
    }

    // make sure all 4 expected keys are present
    for (let key in expectedStructure) {
      if (!this.options.twitter[key]) {
        noMissingKeys = false
        missingKey = key
      }
    }

    // set this.twitterClient to a new instance of the twitter api object
    if (noMissingKeys) {
      return new Twitter({
        consumer_key: this.options.twitter.consumer_key,
        consumer_secret: this.options.twitter.consumer_secret,
        access_token_key: this.options.twitter.access_token_key,
        access_token_secret: this.options.twitter.access_token_secret
      })
    // otherwise return an error
    } else {
      if (missingKey) {
        throw new Error('Missing twitter api key: ' + missingKey)
      }
      throw new Error('Missing twitter API keys!')
    }
  }

  getTweets (cb) {
    let arrayOfTweets = []
    let lastID
    let count = 0
    let get = (max_id) => {
      this.twitterClient.get('statuses/user_timeline', {screen_name: this.options.account, max_id: max_id, count: 200, exclude_replies: true, include_rts: false}, (error, timeline, response) => {
        if (error) throw new Error(error[0].message)
        timeline.forEach((e, i, a) => {
          arrayOfTweets.push(e.text)
          if (i === a.length - 1) {
            lastID = e.id
          }
        })
        count++
        if (count <= 15) {
          get(lastID)
        }
        if (count === 16) {
          cb(arrayOfTweets)
        }
      })
    }
    get()
  }

  generateTweet () {
    let markov = new MarkovGen({
      input: this.arrayOfTweets,
      minLength: 10
    })

    let tweet = markov.makeChain()
    while (tweet.length > 140 && (!tipots(tweet))) {
      tweet = markov.makeChain()
    }

    return tweet
  }
}

module.exports = TwitterBot
