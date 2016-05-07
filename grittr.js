Tasks = new Mongo.Collection('tasks');

if (Meteor.isClient) {
  // This code only runs on the client

  // Declare Angular module (aka app);
  angular.module('simple-todos',['angular-meteor','accounts.ui','ui.bootstrap','ui.router']);

  // This is required for mobile app compilation
  function onReady() {
      angular.bootstrap(document, ['simple-todos']);
  }
  if (Meteor.isCordova)
     angular.element(document).on('deviceready', onReady);
  else
     angular.element(document).ready(onReady);

  // ROUTER
  angular.module('simple-todos').config(function ($urlRouterProvider, $stateProvider, $locationProvider) {
      $locationProvider.html5Mode(true);
   
      $stateProvider
        .state('list', {
          url: '/list',
          templateUrl: 'grittr-list.html',
          controller: 'TodosListCtrl'
        })
        .state('share', {
          url: '/share/:taskId',
          templateUrl: 'grittr-share.html',
          controller: 'ShareCtrl'
       });
   
      $urlRouterProvider.otherwise("/list");
    });


  // CONTROLLERS
  angular.module('simple-todos')
    .controller('TodosListCtrl', ['$scope','$meteor','$location',
      function ($scope, $meteor, $location) {

      // Initialize data for the form
        $scope.newTask='';
        $scope.taskImportant = false;
        $scope.taskUrgent = false;
        $scope.show = false;

      // Subscribe to the tasks
        $scope.$meteorSubscribe('tasks');
        $scope.tasks = $meteor.collection(function(){
        return Tasks.find($scope.getReactively('query'), {sort:{createdAt:-1}})
        }); 

        $scope.addTask = function (newTask, taskImportant, taskUrgent){
          $meteor.call('addTask', newTask, taskImportant, taskUrgent); 
        };

        $scope.deleteTask = function (task) {
          $meteor.call('deleteTask', task._id);
        }

        $scope.setChecked = function (task) {
          $meteor.call('setChecked', task._id, !task.checked); 
        }

        $scope.setPrivate = function (task) {
          $meteor.call('setPrivate', task._id, !task.private);
        };

        $scope.$watch('hideCompleted', function(){
          if ($scope.hideCompleted)
            $scope.query = {checked: {$ne: true}};
          else
            $scope.query = {};
        });
        
        $scope.incompleteCount = function () {
          return Tasks.find ({checked: {$ne:true} }).count();
        };
        
      // Subscribe to all Users
        $scope.$meteorSubscribe('grittrAllUsers');

      // TODO: move this to Angular directive, since it is used in 2 places
        $scope.getUserById = function(userId){
          return Meteor.users.findOne({_id:userId});
        }; 
      // Use go function as a href for buttons
        $scope.go = function ( path, taskId ) {
            $location.path( path+taskId );
          };
      }])
    .controller('ShareCtrl', ['$scope','$meteor','$stateParams','$reactive',
      function ($scope, $meteor, $stateParams, $reactive) {

      let reactiveContext = $reactive(this).attach($scope);

      // Task Id passed via URL of router
        $scope.taskIdfromUrl = $stateParams.taskId;

      // Subscribe to the tasks
        $scope.$meteorSubscribe('tasks');

        $scope.taskToShare = function(){
          return Tasks.findOne({_id:$stateParams.taskId});
        }; 

      // Subscribe to all Users
        $scope.$meteorSubscribe('grittrAllUsers');

      // TODO: move this to Angular directive, since it is used in 2 places
        $scope.getUserById = function(userId){
          return Meteor.users.findOne({_id:userId});
        }; 

        reactiveContext.helpers({
        mytask: function() {
            return Tasks.findOne($stateParams.taskId);
           }
        });
        
        //console.log(this.mytask);
      // Get list of user with who owner can share the task
        var sharedWithArray = [];

        //console.log(this.mytask.sharedWith);

        if (this.mytask.sharedWith == null) {
          //console.log ("UNDEFINDE ARRAY HERY");
          //console.log(sharedWithArray);
        } else 
        {
          var sharedWithArray = this.mytask.sharedWith;
        }

        //console.log(sharedWithArray);

        $scope.grittrAllUsers = $meteor.collection(function(){
          return Meteor.users.find({ $and: [{ _id: {$ne:Meteor.userId()}},{_id:{$nin:sharedWithArray}}] });
        });


      // Share this task with otherUser
        $scope.shareWith = function (task, otherUser) {
          shared = $meteor.call('shareWith', task._id, otherUser._id);
          if (shared) {
            $scope.notification = "Shared with " + otherUser.emails[0].address;
            sharedWithArray.push(task._id);
            //console.log(sharedWithArray);
          }
        }

    }]);// END OF CONTROLLERS
} // END OF METEOR IS CLIENT

// METHODS

Meteor.methods ({
  addTask: function (text, important, urgent) {
    // Make sure the user is looged in before inserting a task  
    if (!Meteor.userId()){
      throw new Meteor.Error('non-authorized');
    }
    // Check input data, might want to get the check outside of this function
    if (!important)
      important = false;
    if (!urgent)
      urgent = false;

    Tasks.insert({
      text:text,
      important:important,
      urgent:urgent,
      createdAt:new Date(),
      owner: Meteor.userId(),
      private:true
    });
  },

  deleteTask: function(taskId){
   Tasks.remove(taskId);
  },

  setChecked: function (taskId, setChecked){
    Tasks.update(taskId, { $set: {checked: setChecked}}); 
  },

  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    //Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, {$set: {private: setToPrivate } });
  },
  
  shareWith: function (taskId, userId) {
    if (!Meteor.userId()){
      throw new Meteor.Error('non-authorized');
    } else if (Meteor.userId() == userId) {
      throw new Meteor.Error("shared-with-itself", 
      "User cannot share the task with oneself");
    }
    // Add users to the Shared with array
    Tasks.update(taskId, {$addToSet: {sharedWith: userId }});
    return true;

  }
}); // END OF METHODS

if (Meteor.isServer) {
  Meteor.publish('tasks', function (){
    return Tasks.find(
      {
        $or: [
          { private: {$ne: true} },
          { owner: this.userId},
          { sharedWith:this.userId }
        ]
      });
  });

  // Publish all Users
  Meteor.publish('grittrAllUsers', function (){
    return Meteor.users.find(); 
  });
}
