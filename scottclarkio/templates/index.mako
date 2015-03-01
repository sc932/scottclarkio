<%inherit file="scottclarkio:templates/contact_card_view.mako"/>

<!-- Main welcome -->
          <div class="hero-unit" style="padding:40px;">
            <h1>Hello.</h1>
            <h3>My name is Scott Clark.</h3>
            <p>I am a co-founder at <a href="https://sigopt.com" target="_blank">SigOpt</a>, a startup that helps people run better experiments, from <a href="https://sigopt.com/cases/ab" target="_blank">A/B tests</a> to <a href="https://sigopt.com/cases/ml" target="_blank">tuning machine learning models</a> to <a href="https://sigopt.com/cases/physical_experiment" target="_blank">physical experiments</a>. I love coding, math and building things. Check out my <a href="http://github.com/sc932">current and past projects</a>, my <a href="http://github.com/sc932/resume" target="_blank">resume/CV</a> and <a href="http://blog.sigopt.com">the SigOpt blog</a>.</p>
          </div><!--/hero-->

        <!-- Blog/Twitter preview -->
        <div class="row-fluid">
          <div class="span6">
            <h3>Press</h3>
            <div class="media">
              <a class="pull-left" href="http://techcrunch.com/2015/02/12/sigopt-launch/" target="_blank">
                <img src="${request.static_url('scottclarkio:static/img/logo_TC.png')}" width="72px">
              </a>
              <div class="media-body">
                <h4 class="media-heading">
                  YC-Backed SigOpt Helps Customers Optimize Everything From Online Ads To Shaving Cream
                </h4>
              </div>
            </div>
            <div class="media">
              <a class="pull-left" href="http://blog.ycombinator.com/sigopt-yc-w15-helps-customers-optimize-everything-from-online-ads-to-shaving-cream" target="_blank">
                <img src="${request.static_url('scottclarkio:static/img/logo_YC.png')}" width="72px">
              </a>
              <div class="media-body">
                <h4 class="media-heading">
                  SigOpt (YC W15) Helps Customers Optimize Everything From Online Ads To Shaving Cream
                </h4>
              </div>
            </div>
            <div class="media">
              <a class="pull-left" href="http://www.wsj.com/articles/academic-researchers-find-lucrative-work-as-big-data-scientists-1407543088" target="_blank">
                <img src="${request.static_url('scottclarkio:static/img/logo_WSJ.png')}" width="72px">
              </a>
              <div class="media-body">
                <h4 class="media-heading">
                  Big Data's High-Priests of Algorithms
                </h4>
              </div>
            </div>
          </div>
          <div class="span6">
            <a class="twitter-timeline" data-dnt="true" href="https://twitter.com/DrScottClark" data-widget-id="437347502774173696">Tweets by @DrScottClark</a>
            <script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+"://platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>
          </div>
        </div>
