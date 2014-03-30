<%inherit file="scottclarkio:templates/contact_card_view.mako"/>

<!-- Main welcome -->
          <div class="hero-unit" style="padding:40px;">
            <h1>Hello.</h1>
            <h3>My name is Scott Clark.</h3>
            <p>I am a software engineer at <a href="http://internets.yelp.com" target="_blank">Yelp Inc</a> in San Francisco. I love coding, math and building things. Check out my <a href="http://github.com/sc932">current and past projects</a>, my <a href="http://github.com/sc932/resume" target="_blank">resume/CV</a> and <a href="${request.route_url('blog_index')}">blog</a>.</p>
          </div><!--/hero-->

        <!-- Blog/Twitter preview -->
        <div class="row-fluid">
          <div class="span6">
            <%include file="scottclarkio:templates/blog_pagination.mako"/>
          </div>
          <div class="span6">
            <a class="twitter-timeline" data-dnt="true" href="https://twitter.com/DrScottClark" data-widget-id="437347502774173696">Tweets by @DrScottClark</a>
            <script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+"://platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>
          </div>
        </div>

<p><a href="${request.route_url('blog_action',action='create')}">
Create a new blog entry</a></p>
