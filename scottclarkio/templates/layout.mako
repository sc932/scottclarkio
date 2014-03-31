<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Scott Clark</title>
  <meta name="keywords" content="python web application" />
  <meta name="description" content="pyramid web application" />
  <link rel="shortcut icon" href="${request.static_url('scottclarkio:static/ico/favicon.ico')}" />
  <link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/2.3.2/css/bootstrap.min.css" type="text/css" media="all" charset="utf-8" />
  <link href="//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" rel="stylesheet">
</head>
<body>

<!-- Nav bar -->
    <div class="navbar navbar-fixed-top">
      <div class="navbar-inner">
        <div class="container-fluid">
          <a class="brand" href="${request.route_url('home')}">Scott Clark</a>
          <div class="nav-collapse">
            <ul class="nav">
              % if route_type == 'home': 
                <li class="active">
              % else:
                <li>
              % endif
              <a href="${request.route_url('home')}">Home</a></li>
              % if route_type == 'blog': 
                <li class="active">
              % else:
                <li>
              % endif
              <a href="blog">Blog</a></li>
              <li><a href="http://github.com/sc932/resume" target="_blank">Resume/CV</a></li>
              % if route_type == 'about': 
                <li class="active">
              % else:
                <li>
              % endif
              <a href="${request.route_url('about')}">About</a></li>
            </ul>
            <ul class="nav pull-right">
              <li><a href="mailto:scott@scottclark.io" target="_blank"><i class="fa fa-envelope"></i></a></li>
              <li><a href="http://www.facebook.com/therealscottclark" target="_blank"><i class="fa fa-facebook"></i></a></li>
              <li><a href="http://www.twitter.com/DrScottClark" target="_blank"><i class="fa fa-twitter"></i></a></li>
              <li><a href="http://www.linkedin.com/pub/scott-clark/A/358/B39" target="_blank"><i class="fa fa-linkedin-square"></i></a></li>
              <li><a href="http://www.github.com/sc932" target="_blank"><i class="fa fa-github"></i></a></li>
          </div><!--/.nav-collapse -->
        </div>
      </div>
    </div>

  <div id="wrap">
    <div id="content" style="padding-top:60px;">
      ${next.body()}
    </div>
  </div>

<!-- footer -->
      <hr>
      <footer>
      <center><p><a href="${request.route_url('home')}">Home</a> | <a href="${request.route_url('blog_index')}">Blog</a> | <a href="http://github.com/sc932/resume">Resume/CV</a> | <a href="${request.route_url('about')}">About</a></p></center>
      <center><p>
              <a href="mailto:scott@scottclark.io" target="_blank"><i class="fa fa-envelope"></i></a> | 
              <a href="http://www.facebook.com/therealscottclark" target="_blank"><i class="fa fa-facebook"></i></a> | 
              <a href="http://www.twitter.com/DrScottClark" target="_blank"><i class="fa fa-twitter"></i></a> | 
              <a href="http://www.linkedin.com/pub/scott-clark/A/358/B39" target="_blank"><i class="fa fa-linkedin-square"></i></a> | 
              <a href="http://www.github.com/sc932" target="_blank"><i class="fa fa-github"></i></a>
      </p></center>
        <%
        from pyramid.security import authenticated_userid
        user_id = authenticated_userid(request)
        %>
        <center>
        % if user_id:
            Signed in as <strong>${user_id}</strong> ::
            <a href="${request.route_url('auth',action='out')}">Sign out <i class="fa fa-sign-out"></i></a>
        %else:
        %endif
        </center>
      <center><p>&copy; Scott Clark 2012</p></center>
      </footer>
</body>

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-49537011-1', 'scottclark.io');
  ga('send', 'pageview');

</script>

</html>
