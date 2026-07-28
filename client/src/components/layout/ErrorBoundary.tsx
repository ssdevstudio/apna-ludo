import { Component, ReactNode } from "react";

export class ErrorBoundary extends Component<{children:ReactNode},{hasError:boolean;error:Error|null}> {
  constructor(props:{children:ReactNode}){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(e:Error){return{hasError:true,error:e};}
  render(){
    if(this.state.hasError) {
      return (
        <main className="landing" style={{display:'grid',placeItems:'center',minHeight:'100vh',textAlign:'center',padding:20}}>
          <div>
            <h1 style={{fontSize:60}}>💥</h1>
            <h2 style={{fontFamily:"'Yeseva One',serif",fontSize:32,margin:'10px 0'}}>Something broke!</h2>
            <p style={{color:'#657875',fontSize:13,marginBottom:20,fontFamily:'DM Mono,monospace'}}>{this.state.error?.message??"Unknown"}</p>
            <button className="primary-button" onClick={()=>{this.setState({hasError:false,error:null});window.location.reload()}}>Reload <span>↻</span></button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
