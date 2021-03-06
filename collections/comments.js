CommentModel = Graviton.Model.extend({
  belongsTo: {
    user: {
      collectionName: 'users',
      field: 'userId'
    },
    post: {
      collectionName: 'posts',
      field: 'postId'
    }
  }
}, {
  author: function() {
    return this.get('author');
  },
  body: function() {
    return this.get('body');
  },
  submittedText: function() {
    return new Date(this.get('submitted')).toString();
  },
  postTitle: function() {
    // this data is not part of the de-normalization, so this is the relational way to find this
    return this.post().title();
  }
});

Comments = Graviton.define('comments', {
  modelCls: CommentModel
});

Meteor.methods({
  comment: function(commentAttributes) {
    var user = Meteor.user();
    var post = Posts.findOne(commentAttributes.postId);
    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to login to make comments");
      
    if (!commentAttributes.body)
      throw new Meteor.Error(422, 'Please write some content');
      
    if (!post)
      throw new Meteor.Error(422, 'You must comment on a post');
    
    var comment = _.extend(_.pick(commentAttributes, 'postId', 'body'), {
      userId: user._id,
      author: user.username,
      submitted: new Date().getTime()
    });
    
    // update the post with the number of comments
    Posts.update(comment.postId, {$inc: {commentsCount: 1}});
    
    // create the comment, save the id
    comment = Comments.build().set(comment);
    post.comments.add(comment);
    
    // now create a notification, informing the user that there's been a comment
    createCommentNotification(comment);
    
    return comment._id;
  }
});