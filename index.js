const Twitter = require('twitter')
const MarkovGen = require('markov-generator')
const tipots = require('this-is-probably-ok-to-say')
const schedule = require('node-schedule')

class TwitterBot {

  constructor (options) {
    this.arrayOfTweets = []
    this.options = {
      hour: 4,
      minute: 0,
      account: '',
      db: null,
      twitter: {
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
        access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
      }
    }

    Object.assign(this.options, options)

    if (!this.options.account) {
      throw new Error('No twitter account handle was assigned in options')
    }

    this.twitterClient = this.createTwitterClient()

    this.getTweets(() => {
      this.setTimedFunctions()
      console.log('Retrieved tweets and set timed functions')
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

  writeTweetsToFile (arrayOfTweets) {

  }

  getTweets (cb) {
    let lastID
    let count = 0
    let get = (max_id) => {
      this.twitterClient.get('statuses/user_timeline', {screen_name: this.options.account, max_id: max_id, count: 200, exclude_replies: true, include_rts: false}, (error, timeline, response) => {
        if (error) throw new Error(error[0].message)
        timeline.forEach((e, i, a) => {
          if (!this.arrayOfTweets.includes(e.text)) {
            this.arrayOfTweets.push(e.text)
          }
          if (i === a.length - 1) {
            lastID = e.id
          }
        })
        count++
        if (count <= 15) {
          get(lastID)
        }
        if (count === 16) {
          cb(this.arrayOfTweets)
        }
      })
    }
    get()
  }

  generateTweet (callback) {
    if (!this.arrayOfTweets.length) {
      throw new Error('arrayOfTweets was empty!')
    }

    let markov = new MarkovGen({
      input: this.arrayOfTweets,
      minLength: 6
    })

    let tweet = markov.makeChain()
    while (tweet.length > 140 && (!tipots(tweet))) {
      tweet = markov.makeChain()
    }

    if (callback) { return callback(tweet) }

    return tweet
  }

  postTweet (callback) {
    this.getTweets(() => {
      this.generateTweet((tweet) => {
        this.twitterClient.post('statuses/update', {status: tweet}, function (error, postedTweet, response) {
          if (error) {
            console.log(error)
            throw error
          }
          if (callback) {
            callback()
          } else {
            console.log(postedTweet)
          }
        })
      })
    })
  }

  setTimedFunctions () {
    let updateRule = new schedule.RecurrenceRule()
    updateRule.hour = 1
    updateRule.minute = 55

    schedule.scheduleJob(updateRule, () => {
      this.getTweets((array) => {
        console.log('updated tweets at ' + Date.now())
      })
    })

    let cronString = this.options.minute + ' */' + this.options.hour + ' * * *'
    schedule.scheduleJob(cronString, function () {
      this.postTweet()
    })
  }
}

module.exports = TwitterBot
