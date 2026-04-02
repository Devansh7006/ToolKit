from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class ARPRequest(BaseModel):
    interface: str
    ip_range: str
    broadcast: str = "ff:ff:ff:ff:ff:ff"


@router.get("/interfaces")
def get_interfaces():
    try:
        import psutil
        stats = psutil.net_if_stats()
        ifaces = list(stats.keys())
        # Filter loopback, sort active first
        active   = [i for i in ifaces if stats[i].isup   and i.lower() not in ("lo", "loopback")]
        inactive = [i for i in ifaces if not stats[i].isup and i.lower() not in ("lo", "loopback")]
        ordered  = active + inactive
        return {"status": "success", "interfaces": ordered if ordered else ifaces}
    except ImportError:
        try:
            from scapy.all import get_if_list
            return {"status": "success", "interfaces": get_if_list()}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/arp-scan")
def arp_scan(req: ARPRequest):
    try:
        from scapy.all import ARP, Ether, srp
        packet = Ether(dst=req.broadcast) / ARP(pdst=req.ip_range)
        ans, _ = srp(packet, timeout=2, iface=req.interface, inter=0.1, verbose=False)

        results = [{"ip": rcv.psrc, "mac": rcv.hwsrc} for _, rcv in ans]

        return {
            "status": "success",
            "devices": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
