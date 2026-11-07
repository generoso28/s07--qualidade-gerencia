pipeline {
  agent any

  options {
    timeout(time: 30, unit: 'MINUTES')
    timestamps()
    ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '10'))
  }

  environment {
    RUNNER = 'playwright-runner'
    WS     = '/workspace'
  }

  stages {
    stage('Checkout') {
      steps {
        dir(WS) {
          deleteDir()
          checkout scm
        }
      }
    }

    stage('Install') {
      steps {
        sh "docker exec -w ${WS} ${RUNNER} npm ci"
      }
    }

    stage('Testes') {
      steps {
        sh "docker exec -w ${WS} ${RUNNER} npx playwright test"
      }
    }

    stage('Cobertura') {
      steps {
        sh "docker exec -w ${WS} ${RUNNER} node scripts/test-coverage.js 90"
      }
    }

    stage('Build') {
      steps {
        sh "docker exec -w ${WS} ${RUNNER} npm run build"
        sh "docker exec -w ${WS} ${RUNNER} mkdir -p dist"
        sh "docker exec -w ${WS} ${RUNNER} npm pack --pack-destination dist"
      }
    }
  }

  post {
    always {
      dir(WS) {
        junit allowEmptyResults: true, testResults: 'results/*.xml'
        archiveArtifacts artifacts: 'dist/**, results/**, playwright-report/**', allowEmptyArchive: true
        publishHTML(target: [
          allowMissing: true,
          alwaysLinkToLastBuild: true,
          keepAll: true,
          reportDir: 'playwright-report',
          reportFiles: 'index.html',
          reportName: 'E2E — Playwright'
        ])
      }

      catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
        sh """
          docker exec \
            -e BUILD_NUMBER='${env.BUILD_NUMBER}' \
            -e BUILD_STATUS='${currentBuild.currentResult}' \
            -e GIT_COMMIT='${env.GIT_COMMIT}' \
            -e BUILD_DURATION='${currentBuild.duration}' \
            -e BUILD_URL='${env.BUILD_URL}' \
            -w ${WS} ${RUNNER} \
            node scripts/store-result.js
        """
      }

      catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
        sh """
          BUILD_DURATION='${currentBuild.duration}' \
          bash ${WS}/docker/scripts/notify.sh \
            '${currentBuild.currentResult}' \
            '${env.BUILD_URL}' \
            '${env.DESTINATARIO_EMAIL}'
        """
      }
    }
  }
}
