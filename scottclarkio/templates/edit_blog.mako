<%inherit file="scottclarkio:templates/layout.mako"/>

<div class="container-fluid">
    <div class="row-fluid">
        <div class="span12">
            <form action="${request.route_url('blog_action',action=action)}" method="post">
            %if action =='edit':
            ${form.id()}
            %endif

            % for error in form.title.errors:
            <div class="error">${ error }</div>
            % endfor

            <div><label>${form.title.label}</label>${form.title()}</div>

            % for error in form.body.errors:
            <div class="error">${error}</div>
            % endfor

            <div class="blog-entry"><label>${form.body.label}</label>${form.body()}</div>
            <div><input type="submit" value="Submit"></div>
            </form>
            <p><a href="${request.route_url('home')}">Go Back</a></p>
        </div>
    </div>
</div>
